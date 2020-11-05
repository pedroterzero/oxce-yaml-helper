import { Uri, WorkspaceFolder } from "vscode";
import { RuleType, Definition, DefinitionLookup } from "./rulesetTree";
import * as deepmerge from 'deepmerge';
import { logger } from "./logger";
import { typedProperties } from "./typedProperties";


export type RulesetFile = { file: Uri, definitions: Definition[] }

type TypeLookup = {
    [key: string]: DefinitionLookup[];
};

export class WorkspaceFolderRuleset {
    public definitionsLookup: {[key: string]: DefinitionLookup[]} = {};
    public rulesetFiles: RulesetFile[] = [];

    constructor(public workspaceFolder: WorkspaceFolder) {
    }

    public mergeIntoRulesetTree(definitions: Definition[], sourceFile: Uri) {
        this.addRulesetFile(definitions, sourceFile || null);
        this.definitionsLookup = {};

        this.rulesetFiles.forEach((ruleset) => {
            this.definitionsLookup = deepmerge(
                this.definitionsLookup,
                this.getLookups(ruleset.definitions, ruleset.file)
            );
        });

        logger.debug('Number of type names', Object.keys(this.definitionsLookup).length);
    }

    private getLookups(definitions: Definition[], sourceFile: Uri): TypeLookup {
        const lookups: TypeLookup = {};

        for (const definition of definitions) {
            if (!(definition.name in lookups)) {
                lookups[definition.name] = [];
            }

            lookups[definition.name].push(this.getDefinitionLookup(definition, sourceFile));
        }

        return lookups;
    }

    private getDefinitionLookup(definition: Definition, sourceFile: Uri): DefinitionLookup {
        return {
            type: definition.type,
            range: definition.range,
            file: sourceFile
        };
    }

    /**
     * Get definitions by their type name
     * @param key
     * @param sourceRuleType
     */
    public getDefinitionsByName(key: string, sourceRuleType: RuleType | undefined): DefinitionLookup[] {
        if (key in this.definitionsLookup) {
            return this.definitionsLookup[key].filter(lookup => {
                return typedProperties.isTargetForSourceRule(sourceRuleType, lookup.type)
            });
        }

        return [];
    }

    private addRulesetFile(definitions: Definition[], sourceFile: Uri) {
        const rulesetFile = { definitions, file: sourceFile };
        if (this.rulesetFiles.length > 0 && rulesetFile.file) {
            this.rulesetFiles = this.rulesetFiles.filter(tp => tp.file && tp.file.path !== rulesetFile.file.path);
        }
        this.rulesetFiles.push(rulesetFile);
    }
}