import { Uri, WorkspaceFolder } from "vscode";
import { Ruleset, LookupMap, RuleType } from "./rulesetTree";
import { LookupMapGenerator } from "./lookupMapGenerator";
import * as deepmerge from 'deepmerge';
import { typedProperties } from "./typedProperties";

export type RulesetPart = { file: Uri, rulesets: Ruleset }

export class WorkspaceFolderRuleset {
    public workspaceFolder: WorkspaceFolder;
    public ruleset: Ruleset = {};
    public rulesetParts: RulesetPart[] = [];
    public lookupMap: LookupMap = {};

    constructor(workspaceFolder: WorkspaceFolder) {
        this.workspaceFolder = workspaceFolder;
    }

    public mergeIntoRulesetTree(treePart: Ruleset, sourceFile: Uri) {
        this.addRulesetPart(treePart, sourceFile || null);
        this.ruleset = {};
        this.rulesetParts.forEach((rulesetPart) => {
            this.ruleset = deepmerge(
                true,
                this.ruleset,
                rulesetPart.rulesets
            );
        });

        this.lookupMap = new LookupMapGenerator(this.ruleset).generateLookupMap();
    }

    public getRuleFiles(key: string, ruleType: RuleType | undefined): RulesetPart[] | undefined {
        const ret = this.rulesetParts.filter(rulesetPart => {
            const result = this.traverseRuleset(key, rulesetPart.rulesets, ruleType);
            return result === true;
        });

        return ret;
    }

    private addRulesetPart(ruleset: Ruleset, sourceFile: Uri) {
        const rulesetPart = { rulesets: ruleset, file: sourceFile };
        if (this.rulesetParts.length > 0 && rulesetPart.file) {
            this.rulesetParts = this.rulesetParts.filter(tp => tp.file && tp.file.path !== rulesetPart.file.path);
        }
        this.rulesetParts.push(rulesetPart);
    }

    private traverseRuleset(key: string, ruleset: Ruleset, sourceRuleType: RuleType | undefined): boolean {
        // let result: any = ruleset;
        let match = false;

        Object.keys(ruleset).forEach(ruleType => {
            Object.values(ruleset[ruleType]).forEach((rule: any) => {
                if (typedProperties.isTypePropertyForKey(ruleType, rule, key) && typedProperties.isTargetForSourceRule(sourceRuleType, ruleType)) {
                    match = true;
                }
            });
        });

        return match;
    }
}