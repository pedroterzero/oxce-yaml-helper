import { workspace, Uri, Disposable, FileSystemWatcher, WorkspaceFolder, Progress, window, ExtensionContext, FileType, ConfigurationTarget } from 'vscode';
import { logger } from "./logger";
import { Definition, Match, rulesetTree, Translation, Variables } from "./rulesetTree";
import { EventEmitter } from "events";
import { rulesetParser } from "./rulesetParser";
import deepmerge = require('deepmerge');
import { rulesetDefinitionChecker } from './rulesetDefinitionChecker';
import { rulesetFileCacheManager } from './rulesetFileCacheManager';
import { existsSync } from 'fs';

export type ParsedRuleset = {
    definitions?: Definition[];
    references?: Match[];
    variables?: Variables;
    translations: Translation[];
};

export class RulesetResolver implements Disposable {
    private loaded = false;
    private context?: ExtensionContext;
    private fileSystemWatcher?: FileSystemWatcher;
    private yamlPattern = '**/*.rul';
    private readonly onDidLoadEmitter: EventEmitter = new EventEmitter();
    private readonly onDidRefreshEmitter: EventEmitter = new EventEmitter();
    private rulesetHierarchy: {[key: string]: Uri} = {};
    private processingFiles: {[key: string]: boolean} = {};
    private deletingFiles: {[key: string]: boolean} = {};
    private savedFiles: {[key: string]: boolean} = {};

    public isLoaded() {
        return this.loaded;
    }

    public setExtensionContent(context: ExtensionContext): void {
        this.context = context;
        rulesetFileCacheManager.setExtensionContent(context);
    }

    public async load(progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        this.init();
        const start = new Date();

        progress.report({ increment: 0 });

        this.onDidLoadRulesheet(this.ruleSheetLoaded.bind(this, progress));

        await this.loadYamlFiles();
        progress.report({ increment: 100 });
        logger.debug(`yaml files loaded, took ${((new Date()).getTime() - start.getTime()) / 1000}s`);

        this.onDidLoadRulesheet(this.ruleSheetReloaded.bind(this, progress));

        this.refreshWorkspaceFolderRulesets();

        this.registerFileWatcher();

        this.loaded = true;
        this.onDidLoadEmitter.emit('didLoad');
    }

    public onDidLoad(listener: () => void) {
        this.onDidLoadEmitter.addListener('didLoad', listener);
    }

    public onDidLoadRulesheet(listener: (file: string, files: number, totalFiles: number) => void) {
        this.onDidLoadEmitter.addListener('didLoadRulesheet', listener);
    }

    public onDidRefresh(listener: () => void) {
        this.onDidRefreshEmitter.addListener('didRefresh', listener);
    }

    public removeOnDidRefresh(listener: () => void) {
        this.onDidRefreshEmitter.removeListener('didRefresh', listener);
    }

    private init(): void {
        logger.debug('init');

        const pattern = workspace.getConfiguration('oxcYamlHelper').get<string>('ruleFilesPattern');
        if (pattern) {
            this.yamlPattern = pattern;
        }
        logger.debug('using pattern', this.yamlPattern);

        // workspace.onDidCloseTextDocument((e) => {
        //     logger.debug(`[${(new Date()).toISOString()}] closing textDocument (remaining: ${workspace.textDocuments.length}) ${e.fileName}`);
        // });

        rulesetTree.init();
    }

    private ruleSheetLoaded (progress: Progress<{ message?: string; increment?: number }>, file: string, filesLoaded: number, totalFiles: number): void {
        const increment = Math.round((1 / totalFiles) * 100);

        progress.report({increment: increment, message: `${file} (${filesLoaded}/${totalFiles})`});
    }

    private ruleSheetReloaded (): void {
        // wait until we are not processing files anymore
        if (Object.keys(this.processingFiles).length > 0 || Object.keys(this.deletingFiles).length > 0) {
            // logger.debug(`still processing ${Object.keys(this.processingFiles).length} files (deleted: ${Object.keys(this.deletingFiles).length}), open: ${workspace.textDocuments.length}`);
            return;
        }

       logger.info(`refreshing workspace folder rulesets`);
       this.refreshWorkspaceFolderRulesets();
       this.onDidRefreshEmitter.emit('didRefresh');
    }

    private async loadYamlFiles(): Promise<undefined | void[][]> {
        if (!workspace.workspaceFolders) {
            return;
        }

        return Promise.all(workspace.workspaceFolders.map(async workspaceFolder => {
            logger.debug('loading yaml files for workspace dir:', workspaceFolder.name);
            const files = await this.getYamlFilesForWorkspaceFolder(workspaceFolder);
            return Promise.all(files.map(file => {
                logger.debug(`loading ruleset file: ${this.getCleanFile(file, workspaceFolder.uri)}`);
                return this.loadYamlIntoTree(file, workspaceFolder, files.length);
            }));
        }));
    }

    private async getYamlFilesForWorkspaceFolder(workspaceFolder: WorkspaceFolder): Promise<Uri[]> {
        let files = await workspace.findFiles(this.yamlPattern, '');
        files = deepmerge(files, await workspace.findFiles('**/Language/*.yml'));

        files = files.filter(file => workspace.getWorkspaceFolder(file)?.uri.path === workspaceFolder.uri.path);

        await this.getAssetRulesets(files);

        this.rulesetHierarchy.mod = workspaceFolder.uri;

        logger.debug(`Hierarchy: ${JSON.stringify(this.rulesetHierarchy)}`);

        for (const idx in files) {
            if (!files[idx].fsPath) {
                // make sure we get the fs path (we don't get them from the workspace)
                files[idx] = Uri.file(files[idx].path);
            }
        }

        if (files.length === 0) {
            logger.warn(`no ruleset files in project dir found, ${workspaceFolder.uri.path} is probably not an OXC(E) project.`);
            return files;
        }

        return files;
    }

    private async getAssetRulesets(files: Uri[]) {
        const assetPath = this.getAssetUri();
        this.rulesetHierarchy.vanilla = assetPath;

        if (this.context) {
            const assets = await workspace.fs.readDirectory(assetPath);

            for (const [name, type] of assets) {
                if (type === FileType.File) {
                    if (name.endsWith('.rul')) {
                        files.push(Uri.joinPath(assetPath, '/', name));
                    }
                }
            }
        }
    }

    private registerFileWatcher(): void {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
        this.fileSystemWatcher = workspace.createFileSystemWatcher('**/' + this.yamlPattern);
        this.fileSystemWatcher.onDidDelete((e: Uri) => {
            logger.debug(`file deleted ${e.path}`);
            this.deletingFiles[e.path] = true;
            this.deleteFileFromTree(e);
        });
        this.fileSystemWatcher.onDidCreate(async (e: Uri) => {
            this.loadYamlIntoTree(e);
        });

        this.handleFileChanges(this.fileSystemWatcher);
    }

    private handleFileChanges(watcher: FileSystemWatcher) {
        watcher.onDidChange((e: Uri) => {
            const isSavedFile = e.path in this.savedFiles;
            if (isSavedFile) {
                // saved files don't get a `onDidChangeTextDocument`, so handle it differently
                delete this.savedFiles[e.path];
            } else {
                this.processingFiles[e.path] = true;
            }

            // const folder = workspace.getWorkspaceFolder(Uri.file(e.path));
            // if (folder) {
            //     rulesetTree.getDiagnosticCollection(folder)?.clear();
            // }

            logger.debug(`reloading ruleset file: ${e.path} (processing: ${Object.keys(this.processingFiles).length}) (deleted: ${Object.keys(this.deletingFiles).length})`);
            if (isSavedFile || !workspace.textDocuments.find(wsFile => wsFile.fileName === e.fsPath)) {
                // logger.debug(`textdocument not open for file ${e.path}, loading`);
                this.loadYamlIntoTree(e);
            }
        });

        workspace.onDidSaveTextDocument((e) => {
            // logger.debug(`textdoc saved: ${e.uri.path}`);
            this.savedFiles[e.uri.path] = true;
        });

        workspace.onDidChangeTextDocument((e) => {
            // wait for the textdocument to change, before parsing again
            if (!(e.document.uri.path in this.processingFiles)) {
                // logger.debug(`NOT! in list ${e.document.uri.path}`);
                return;
            }

            logger.debug(`textdoc changed: ${e.document.uri.path}`);
            this.loadYamlIntoTree(e.document.uri);
        });
    }

    private deleteFileFromTree(file: Uri) {
        const workspaceFolder = workspace.getWorkspaceFolder(file);
        if (!workspaceFolder) {
            throw new Error('workspace folder could not be found');
        }

        rulesetTree.deleteFileFromTree(workspaceFolder, file);

        // trigger a reload (should maybe have its own event)?
//        logger.debug(`deleted ${path}`);
        delete this.deletingFiles[file.path];
        this.onDidLoadEmitter.emit('didLoadRulesheet');
    }

    private async loadYamlIntoTree(file: Uri, workspaceFolder?: WorkspaceFolder, numberOfFiles?: number): Promise<void> {
        if (!workspaceFolder) {
            workspaceFolder = workspace.getWorkspaceFolder(file);
        }
        if (!workspaceFolder) {
            throw new Error('workspace folder could not be found');
        }

        let parsed: ParsedRuleset | undefined = await rulesetFileCacheManager.retrieve(file);
        if (parsed) {
            logger.debug(`Retrieved ${file.path} from cache`);
        } else {
            parsed = await this.parseDocument(file, workspaceFolder);
        }
        if (!parsed) {
            logger.error(`Could not parse/retrieve from cache ${file.path}`);
            delete this.processingFiles[file.path];
            return;
        }

        if (parsed.definitions) {
            rulesetTree.mergeIntoTree(parsed.definitions, workspaceFolder, file);
        }
        if (parsed.references) {
            rulesetTree.mergeReferencesIntoTree(parsed.references, workspaceFolder, file);
        }
        if (parsed.variables) {
            rulesetTree.mergeVariablesIntoTree(parsed.variables, workspaceFolder, file);
        }

        rulesetTree.mergeTranslationsIntoTree(parsed.translations, workspaceFolder, file);

        delete this.processingFiles[file.path];
        this.onDidLoadEmitter.emit('didLoadRulesheet', file.path.slice(workspaceFolder.uri.path.length + 1), rulesetTree.getNumberOfParsedDefinitionFiles(workspaceFolder), numberOfFiles);
    }

    private async parseDocument(file: Uri, workspaceFolder: WorkspaceFolder): Promise<ParsedRuleset | undefined> {
        const document = await this.getTextDocument(file);
        if (document.getText().trim().length === 0) {
            // new files could be empty
            return {
                translations: []
            };
        }

        try {
            const doc = rulesetParser.parseDocument(document.getText());
            const docObject = doc.regular.toJSON();

            const isLanguageFile = file.path.indexOf('Language/') !== -1 && file.path.slice(file.path.lastIndexOf('.')) === '.yml';

            let translations: Translation[] = [];
            let parsed: ParsedRuleset;
            if (isLanguageFile) {
                translations = rulesetParser.getTranslationsFromLanguageFile(docObject);
                parsed = {translations};
            } else {
                const references = rulesetParser.getReferencesRecursively(doc.parsed);
                rulesetParser.addRangePositions(references, document);
                logger.debug(`found ${references?.length} references in file ${this.getCleanFile(file, workspaceFolder.uri)}`);
                const definitions = rulesetParser.getDefinitionsFromReferences(references);
                logger.debug(`found ${definitions.length} definitions in file ${this.getCleanFile(file, workspaceFolder.uri)}`);

                // can't use references (yet), variables and extraStrings are not references (yet) (they are keys, not values)
                const variables = rulesetParser.getVariables(references);
                translations = rulesetParser.getTranslations(docObject);

                parsed = {definitions, references, variables, translations};
            }

            // don't need to wait for cache to be written
            /*await */rulesetFileCacheManager.put(file, parsed);

            return parsed;
        } catch (error) {
            logger.error('loadYamlIntoTree', file.path, error.message);
        }

        return;
    }

    private async getTextDocument(file: Uri) {
        let doc;
        if ((doc = workspace.textDocuments.find(wsFile => wsFile.fileName === file.path))) {
            // quicker way of getting the text document than opening it
            return doc;
        }

        return await workspace.openTextDocument(file);
    }

    public getTranslationForKey(key: string, sourceUri?: Uri): string | undefined {
        if (!sourceUri) {
            sourceUri = window.activeTextEditor?.document.uri;
        }
        if (!sourceUri) {
            return;
        }

        const folder = workspace.getWorkspaceFolder(sourceUri);
        if (!folder) {
            return;
        }

        const translation = rulesetTree.getTranslation(key, folder);
        if (!translation) {
            return `No translation found for locale '${this.getLocale()}' '${key}'!`;
        }

        return translation;
    }

    public refreshWorkspaceFolderRulesets () {
        if (!workspace.workspaceFolders || !this.context) {
            return;
        }

        workspace.workspaceFolders.map(workspaceFolder => {
            rulesetTree.refresh(workspaceFolder);
        });

        const start = new Date();
        this.validateReferences();
        logger.debug(`rulesets validated, took ${((new Date()).getTime() - start.getTime()) / 1000}s`);
    }

    private validateReferences() {
        if (!workspace.workspaceFolders || !this.context) {
            return;
        }

        workspace.workspaceFolders.map(workspaceFolder => {
            rulesetTree.checkDefinitions(workspaceFolder, this.getAssetUri());
        });

        this.checkForCommonProblems();
    }

    private checkForCommonProblems() {
        const problemsByPath = rulesetDefinitionChecker.getProblemsByPath();
        const itemsCategories = problemsByPath['items.categories'] || 0;
        const manufactureCategory = problemsByPath['manufacture.category'] || 0;

        if (itemsCategories + manufactureCategory > 25) {
            this.proposeDisableCategories();
        }
    }

    private proposeDisableCategories() {
        if (workspace.getConfiguration('oxcYamlHelper').get<string>('validateCategories') !== 'yes') {
            return;
        }

        const message = 'There are many missing category references in these rulesets. Would you like to ignore these from now on?';

        const choices = {
            yes: 'Yes',
            notNow: 'Not now',
            always: 'No and don\'t ask again',
        };

        window.showInformationMessage(
            message, ...Object.values(choices)
        ).then((result) => {
            if (result === choices.yes) {
                workspace.getConfiguration('oxcYamlHelper').update('validateCategories', 'no', ConfigurationTarget.Workspace);
            // } else if (result === choices.notNow) {
            //     console.log(result);
            } else if (result === choices.always) {
                workspace.getConfiguration('oxcYamlHelper').update('validateCategories', 'always', ConfigurationTarget.Workspace);
            }
        });
    }

    private getAssetUri() {
        if (!this.context) {
            throw new Error('Couldn\'t get extension context');
        }

        let path = 'out/assets/xcom1';
        if (existsSync(Uri.joinPath(this.context.extensionUri, '/src/assets/xcom1').fsPath)) {
            path = 'src/assets/xcom1';
        }

        return Uri.joinPath(this.context.extensionUri, '/' + path);
    }

    public getRulesetHierarchy () {
        return this.rulesetHierarchy;
    }

    public getCleanFile (file: Uri, workspaceFolder: Uri) {
        const assetPath = this.getAssetUri();
        let fileClean = '';
        if (file.path.startsWith(assetPath.path)) {
            fileClean = `<ASSETS>/${file.path.slice(assetPath.path.length + 1)}`;
        } else {
            fileClean = file.path.slice(workspaceFolder.path.length + 1);
        }

        return fileClean;
    }

    public getLocale(): string {
        return workspace.getConfiguration('oxcYamlHelper').get<string>('translationLocale') ?? 'en-US';
    }

    public dispose() {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
    }
}
