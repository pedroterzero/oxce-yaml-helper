import { logger } from "./logger";
import { Uri, WorkspaceFolder } from "vscode";
import { WorkspaceFolderRuleset as WorkspaceFolderRuleset, RulesetPart } from "./workspaceFolderRuleset";

export type Ruleset = { [key: string]: string | Ruleset }
export type LookupMap = { [key: string]: string }

export class RulesetTree {
    private workspaceFolderRulesets: WorkspaceFolderRuleset[] = [];

    public init() {
        this.workspaceFolderRulesets = [];
    }

    public mergeIntoTree(treePart: Ruleset, workspaceFolder: WorkspaceFolder, sourceFile?: Uri) {
        this.getOrCreateWorkspaceFolderRuleset(workspaceFolder).mergeIntoRulesetTree(treePart, sourceFile);
    }

    public getRuleFile(key: string, workspaceFolder: WorkspaceFolder): RulesetPart {
        logger.debug('getRuleFile', 'key', key, 'workspaceFolder', workspaceFolder);
        return this.getOrCreateWorkspaceFolderRuleset(workspaceFolder).getRuleFile(key);
    }
   
    public getWorkspaceFolders(): WorkspaceFolder[] {
        return this.workspaceFolderRulesets.map((workspaceFolderRuleset) => workspaceFolderRuleset.workspaceFolder);
    }

    private getWorkspaceFolderRuleset(workspaceFolder: WorkspaceFolder): WorkspaceFolderRuleset {
        if (!workspaceFolder || this.workspaceFolderRulesets.length === 0) {
            return null;
        }
        return this.workspaceFolderRulesets.find((workspaceFolderRuleset) => workspaceFolderRuleset.workspaceFolder.name === workspaceFolder.name);
    }

    private getOrCreateWorkspaceFolderRuleset(workspaceFolder: WorkspaceFolder): WorkspaceFolderRuleset {
        if (!workspaceFolder) {
            return null;
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
