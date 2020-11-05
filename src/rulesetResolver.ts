import { parse as parseYAML } from "yaml";
import * as vscode from 'vscode';
import { workspace, Uri } from 'vscode';
import { logger } from "./logger";
import { rulesetTree, Ruleset } from "./rulesetTree";
import { EventEmitter } from "events";

export class RulesetResolver implements vscode.Disposable {

    private fileSystemWatcher?: vscode.FileSystemWatcher;
    private yamlPattern = '**/*.rul';
    private readonly onDidLoadEmitter: EventEmitter = new EventEmitter();

    public async load(): Promise<void> {
        this.init();
        await this.loadYamlFiles();
        logger.debug('yaml files loaded');
        this.registerFileWatcher();
        this.onDidLoadEmitter.emit('didLoad');
    }

    public onDidLoad(listener: () => any) {
        this.onDidLoadEmitter.addListener('didLoad', listener);
    }

    private init(): void {
        logger.debug('init');

        const pattern = workspace.getConfiguration('oxcYamlHelper').get<string>('ruleFilesPattern');
        if (pattern) {
            this.yamlPattern = pattern;
        }
        logger.debug('using pattern', this.yamlPattern);

        rulesetTree.init();
    }

    private async loadYamlFiles(): Promise<undefined | void[][]> {
        if (!workspace.workspaceFolders) {
            return;
        }

        return Promise.all(workspace.workspaceFolders.map(async workspaceFolder => {
            logger.debug('loading yaml files for workspace dir:', workspaceFolder.name);
            const files = await this.getYamlFilesForWorkspaceFolder(workspaceFolder);
            return Promise.all(files.map(file => {
                logger.debug('loading ruleset file:', file.path);
                return this.loadYamlIntoTree(file, workspaceFolder);
            }));
        }))
    }

    private async getYamlFilesForWorkspaceFolder(workspaceFolder: vscode.WorkspaceFolder): Promise<Uri[]> {
        let files = await workspace.findFiles(this.yamlPattern);

        files = files.filter(file => workspace.getWorkspaceFolder(file)?.uri.path === workspaceFolder.uri.path);
        if (files.length === 0) {
            logger.warn(`no ruleset files in project dir found, ${workspaceFolder.uri.path} is probably not an OXC(E) project.`);
            return files;
        }

        return files;
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

    private async loadYamlIntoTree(file: Uri, workspaceFolder?: vscode.WorkspaceFolder): Promise<void> {
        const document = await workspace.openTextDocument(file.path);
        try {
            if (!workspaceFolder) {
                workspaceFolder = workspace.getWorkspaceFolder(file);
            }
            if (!workspaceFolder) {
                throw new Error('workspace folder could not be found');
            }

            rulesetTree.mergeIntoTree(<Ruleset>parseYAML(document.getText(), { maxAliasCount: 1024 }), workspaceFolder, file);
        } catch (error) {
            logger.error('loadYamlIntoTree', file.path, error.message);
        }
    }

    public dispose() {
        if (this.fileSystemWatcher) {
            this.fileSystemWatcher.dispose();
        }
    }
}