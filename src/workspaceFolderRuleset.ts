import { Uri, WorkspaceFolder } from "vscode";
import { Ruleset, LookupMap, RuleType } from "./rulesetTree";
import { LookupMapGenerator } from "./lookupMapGenerator";
import * as deepmerge from 'deepmerge';
import { typedProperties } from "./typedProperties";

export type RulesetFile = { file: Uri, ruleset: Ruleset }

export class WorkspaceFolderRuleset {
    public ruleset: Ruleset = {};
    public rulesetFiles: RulesetFile[] = [];
    public lookupMap: LookupMap = {};

    constructor(public workspaceFolder: WorkspaceFolder) {
    }

    public mergeIntoRulesetTree(ruleset: Ruleset, sourceFile: Uri) {
        this.addRulesetFile(ruleset, sourceFile || null);
        this.ruleset = {};
        this.rulesetFiles.forEach((ruleset) => {
            this.ruleset = deepmerge(
                this.ruleset,
                ruleset.ruleset
            );
        });

        this.lookupMap = new LookupMapGenerator(this.ruleset).generateLookupMap();
    }

    public getRuleFiles(key: string, ruleType: RuleType | undefined): RulesetFile[] | undefined {
        const ret = this.rulesetFiles.filter(file => {
            const result = this.traverseRuleset(key, file.ruleset, ruleType);
            return result === true;
        });

        return ret;
    }

    private addRulesetFile(ruleset: Ruleset, sourceFile: Uri) {
        const rulesetFile = { ruleset: ruleset, file: sourceFile };
        if (this.rulesetFiles.length > 0 && rulesetFile.file) {
            this.rulesetFiles = this.rulesetFiles.filter(tp => tp.file && tp.file.path !== rulesetFile.file.path);
        }
        this.rulesetFiles.push(rulesetFile);
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