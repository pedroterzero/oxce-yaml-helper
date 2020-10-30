import { Uri, WorkspaceFolder } from "vscode";
import { Ruleset, LookupMap } from "./rulesetTree";
import { LookupMapGenerator } from "./lookupMapGenerator";
import * as merge from "merge";

export type RulesetPart = { file: Uri, rulesets: Ruleset }

export class WorkspaceFolderRuleset {
    public workspaceFolder: WorkspaceFolder;
    public ruleset: Ruleset = {};
    public rulesetParts: RulesetPart[] = [];
    public lookupMap: LookupMap = {};

    constructor(workspaceFolder: WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder;
    }

    public mergeIntoRulesetTree(treePart: Ruleset, sourceFile?: Uri) {
        this.addRulesetPart(treePart, sourceFile || null);
        this.ruleset = {};
        this.rulesetParts.forEach((rulesetPart) => {
            this.ruleset = merge.recursive(
                true,
                this.ruleset,
                rulesetPart.rulesets
            );
        });

        this.lookupMap = new LookupMapGenerator(this.ruleset).generateLookupMap();
    }

    public getRuleFile(key: string): RulesetPart {
        return this.rulesetParts.find(rulesetPart => {
            const result = this.traverseRuleset(key, rulesetPart.rulesets);
            return result === true;
        });
    }    

    private addRulesetPart(ruleset: Ruleset, sourceFile: Uri) {
        const rulesetPart = { rulesets: ruleset, file: sourceFile };
        if (this.rulesetParts.length > 0 && rulesetPart.file) {
            this.rulesetParts = this.rulesetParts.filter(tp => tp.file && tp.file.path !== rulesetPart.file.path);
        }
        this.rulesetParts.push(rulesetPart);
    }

    private traverseRuleset(key: string, ruleset: Ruleset): boolean {
        let result: any = ruleset;

        for (let ruleType in ruleset) {
            let rules: any = ruleset[ruleType];

            for (let ruleIndex in rules) {
                let rule = rules[ruleIndex];

                if (rule.type && (rule.type === key || rule.type.indexOf(key + '.') === 0)) {
                    return true;
                }
            }
        }

        return result;
    }
}