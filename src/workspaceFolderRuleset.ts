import { Uri, WorkspaceFolder } from "vscode";
import { RuleType, Definition, DefinitionLookup, Variables } from "./rulesetTree";
import * as deepmerge from 'deepmerge';
import { logger } from "./logger";
import { typedProperties } from "./typedProperties";

export type RulesetFile = { file: Uri, definitions: Definition[] }
export type VariableFile = { file: Uri, variables: Variables }

type TypeLookup = {
    [key: string]: DefinitionLookup[];
};

export class WorkspaceFolderRuleset {
    public definitionsLookup: {[key: string]: DefinitionLookup[]} = {};
    public rulesetFiles: RulesetFile[] = [];
    public variableFiles: VariableFile[] = [];
    private variables: Variables = {};

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

    public mergeVariablesIntoRulesetTree(variables: Variables, sourceFile: Uri) {
        this.addRulesetVariableFile(variables, sourceFile || null);
        this.definitionsLookup = {};

        this.variableFiles.forEach((file) => {
            this.variables = deepmerge(
                this.variables,
                file.variables
            );
        });

//        logger.debug('Number of variables', Object.keys(this.variables).length);
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
        const override = typedProperties.checkForLogicOverrides(key, sourceRuleType);
        const finalKey = override.key;

        if (finalKey in this.definitionsLookup) {
            const lookups = this.definitionsLookup[finalKey].filter(lookup => {
                if (override.target) {
                    return override.target === lookup.type;
                } else {
                    return typedProperties.isTargetForSourceRule(sourceRuleType, lookup.type);
                }
            });

            return lookups;
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

    private addRulesetVariableFile(variables: Variables, sourceFile: Uri) {
        const variableFile = { variables, file: sourceFile };
        if (this.variableFiles.length > 0 && variableFile.file) {
            this.variableFiles = this.variableFiles.filter(tp => tp.file && tp.file.path !== variableFile.file.path);
        }
        this.variableFiles.push(variableFile);
    }

    public getVariables(): Variables {
        return this.variables;
    }

    public getNumberOfParsedDefinitionFiles(): number {
        return this.rulesetFiles.length;
    }
}