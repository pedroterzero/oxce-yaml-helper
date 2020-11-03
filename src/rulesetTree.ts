import { logger } from "./logger";
import { Uri, WorkspaceFolder } from "vscode";
import { WorkspaceFolderRuleset as WorkspaceFolderRuleset, RulesetPart } from "./workspaceFolderRuleset";

export type Ruleset = { [key: string]: Ruleset }
export type LookupMap = { [key: string]: string }
export type RuleType = { type: string; key: string; }

export class RulesetTree {
    private workspaceFolderRulesets: WorkspaceFolderRuleset[] = [];

    public init() {
        this.workspaceFolderRulesets = [];
    }

    public mergeIntoTree(treePart: Ruleset, workspaceFolder: WorkspaceFolder, sourceFile: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.mergeIntoRulesetTree(treePart, sourceFile);
    }

    public getRuleFiles(key: string, workspaceFolder: WorkspaceFolder, ruleType: RuleType | undefined): RulesetPart[] | undefined {
        logger.debug('getRuleFile', 'key', key, 'workspaceFolder', workspaceFolder);
        const files = this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getRuleFiles(key, ruleType);
        return files;
    }

    public getWorkspaceFolders(): WorkspaceFolder[] {
        return this.workspaceFolderRulesets.map((workspaceFolderRuleset) => workspaceFolderRuleset.workspaceFolder);
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
            workspaceFolderRuleset = new WorkspaceFolderRuleset(workspaceFolder)
            this.workspaceFolderRulesets.push(workspaceFolderRuleset);
        }
        return workspaceFolderRuleset;
    }
}

export const rulesetTree = new RulesetTree();
