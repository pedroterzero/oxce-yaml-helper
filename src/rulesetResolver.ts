import YAML from "yaml";
import * as vscode from 'vscode';
import { workspace, Uri, window } from 'vscode';
import { logger } from "./logger";
import { rulesetTree, Ruleset } from "./rulesetTree";
import { EventEmitter } from "events";

export class RulesetResolver implements vscode.Disposable {

    private fileSystemWatcher;
    private readonly yamlPattern = '**/*.rul';
    private readonly onDidLoadEmitter: EventEmitter = new EventEmitter();

    public load(): Thenable<any> {
        this.init();
        return this.loadYamlFiles().then(_ => {
            logger.debug('yaml files loaded');
            this.registerFileWatcher();
            this.onDidLoadEmitter.emit('didLoad');
        });
    }

    public onDidLoad(listener: () => any) {
        this.onDidLoadEmitter.addListener('didLoad', listener);
    }

    private init(): void {
        logger.debug('init');
        rulesetTree.init();
    }

    private loadYamlFiles(): Thenable<any> {
        return Promise.all(workspace.workspaceFolders.map(workspaceFolder => {
            logger.debug('loading yaml files for workspace dir:', workspaceFolder.name);
            return this.getYamlFilesForWorkspaceFolder(workspaceFolder).then(files => {
                return Promise.all(files.map(file => {
                    logger.debug('loading ruleset file:', file.path);
                    return this.loadYamlIntoTree(file, workspaceFolder);
                }));
            })
        }))
    }

    private getYamlFilesForWorkspaceFolder(workspaceFolder: vscode.WorkspaceFolder): Thenable<Uri[]> {
        const loadAllFiles: boolean = workspace.getConfiguration('oxcYamlThingy').get<boolean>('loadAllRulesets');
        logger.debug('loadAllFiles:', loadAllFiles, 'workspace dir:', workspaceFolder.name);

        return workspace.findFiles(this.yamlPattern).then(files => {
            files = files.filter(file => workspace.getWorkspaceFolder(file).uri.path === workspaceFolder.uri.path)

            if (files.length === 0) {
                logger.warn(`no ruleset files in project dir found, ${workspaceFolder.uri.path} is probably not a rails project.`);
                return files;
            }

            if (!loadAllFiles) {
                return files;
            }
        })
    }

    private registerFileWatcher(): void {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
        this.fileSystemWatcher = workspace.createFileSystemWatcher('**/' + this.yamlPattern);
        this.fileSystemWatcher.onDidChange((e: Uri) => {
            logger.debug('reloading ruleset file:', e.path);
            this.loadYamlIntoTree(e);
        });
    }

    private loadYamlIntoTree(file: Uri, workspaceFolder?: vscode.WorkspaceFolder): Thenable<void> {
        return workspace.openTextDocument(file.path).then((document: vscode.TextDocument) => {
            try {
                if (!workspaceFolder) {
                    workspaceFolder = workspace.getWorkspaceFolder(file);
                }
                rulesetTree.mergeIntoTree(<Ruleset>YAML.parse(document.getText()), workspaceFolder, file);
            } catch (error) {
                logger.error('loadDocumentIntoMap', file.path, error.message);
            }
        });
    }

    public dispose() {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
    }
}