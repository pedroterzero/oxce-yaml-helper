import { logger } from "./logger";
import { Uri, WorkspaceFolder } from "vscode";
import { WorkspaceFolderRuleset as WorkspaceFolderRuleset } from "./workspaceFolderRuleset";

export type Ruleset = { [key: string]: Ruleset }
export type LookupMap = { [key: string]: string }
export type RuleType = { type: string; key: string; metadata?: Record<string, unknown>}

type BaseDefinition = {
    type: string,
    range: [number, number],
    rangePosition: [[number, number], [number, number]],
    metadata?: Record<string, unknown>
};

export type RulesetItems = {
    definitions: Definition[],
    translations: Translation[]
}

export type Translation = {
    language: string,
    key: string,
    value: string
}

export type Match = {
    key: string,
    path: string,
    range: [number, number],
    rangePosition?: [[number, number], [number, number]],
    metadata?: Record<string, unknown>
}

export type Definition = BaseDefinition & {
    // field: typeKey,
    name: string,
};
export type Variables = {
    [key: string]: unknown
};

export type Translations = {
    [key: string]: {
        [key: string]: string;
    };
};

export type DefinitionLookup = BaseDefinition & {
    file: Uri,
};

export class RulesetTree {
    private workspaceFolderRulesets: WorkspaceFolderRuleset[] = [];

    public init() {
        this.workspaceFolderRulesets = [];
    }

    public mergeIntoTree(definitions: Definition[], workspaceFolder: WorkspaceFolder, sourceFile: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.mergeIntoRulesetTree(definitions, sourceFile);
    }

    public mergeReferencesIntoTree(definitions: Match[], workspaceFolder: WorkspaceFolder, sourceFile: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.mergeReferencesIntoRulesetTree(definitions, sourceFile);
    }

    public mergeVariablesIntoTree(variables: Variables, workspaceFolder: WorkspaceFolder, sourceFile: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.mergeVariablesIntoRulesetTree(variables, sourceFile);
    }

    public mergeTranslationsIntoTree(translations: Translation[], workspaceFolder: WorkspaceFolder, sourceFile: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.mergeTranslationsIntoTree(translations, sourceFile);
    }

    public deleteFileFromTree(workspaceFolder: WorkspaceFolder, file: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.deleteFileFromTree(file);
    }

    public getWorkspaceFolders(): WorkspaceFolder[] {
        return this.workspaceFolderRulesets.map((workspaceFolderRuleset) => workspaceFolderRuleset.workspaceFolder);
    }

    public getVariables(workspaceFolder: WorkspaceFolder): Variables | undefined {
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getVariables();
    }

    private getWorkspaceFolderRuleset(workspaceFolder: WorkspaceFolder): WorkspaceFolderRuleset | undefined {
        if (!workspaceFolder || this.workspaceFolderRulesets.length === 0) {
            return;
        }
        return this.workspaceFolderRulesets.find((workspaceFolderRuleset) => workspaceFolderRuleset.workspaceFolder.name === workspaceFolder.name);
    }

    private getOrCreateWorkspaceFolderRuleset(workspaceFolder: WorkspaceFolder): WorkspaceFolderRuleset | undefined {
        if (!workspaceFolder) {
            return;
        }
        let workspaceFolderRuleset = this.getWorkspaceFolderRuleset(workspaceFolder);
        if (!workspaceFolderRuleset) {
            workspaceFolderRuleset = new WorkspaceFolderRuleset(workspaceFolder);
            this.workspaceFolderRulesets.push(workspaceFolderRuleset);
        }
        return workspaceFolderRuleset;
    }

    public getDefinitionsByName(key: string, workspaceFolder: WorkspaceFolder, ruleType: RuleType | undefined) {
        logger.debug('getDefinitionsByName', 'key', key, 'workspaceFolder', workspaceFolder);
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getDefinitionsByName(key, ruleType);
    }

    public getNumberOfParsedDefinitionFiles (workspaceFolder: WorkspaceFolder) {
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getNumberOfParsedDefinitionFiles();
    }

    public getTranslation(key: string, workspaceFolder: WorkspaceFolder): string | undefined {
        logger.debug(`getTranslation key ${key} workspaceFolder ${workspaceFolder}`);
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getTranslation(key);
    }

    public refresh(workspaceFolder: WorkspaceFolder) {
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.refresh();
    }

    public getDiagnosticCollection(workspaceFolder: WorkspaceFolder) {
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getDiagnosticCollection();
    }

    public checkDefinitions(workspaceFolder: WorkspaceFolder, assetUri: Uri): any {
        logger.debug(`checkDefinitions workspaceFolder ${workspaceFolder}`);
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.checkDefinitions(assetUri);
    }
}

export const rulesetTree = new RulesetTree();
