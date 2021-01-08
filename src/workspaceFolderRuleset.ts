import { DiagnosticCollection, languages, Uri, WorkspaceFolder } from "vscode";
import { RuleType, Definition, DefinitionLookup, Variables, Translation, Translations, Match } from "./rulesetTree";
import * as deepmerge from 'deepmerge';
import { logger } from "./logger";
import { typedProperties } from "./typedProperties";
import { rulesetDefinitionChecker } from "./rulesetDefinitionChecker";
import { WorkspaceFolderRulesetHierarchy } from "./workspaceFolderRulesetHierarchy";
import { rulesetResolver } from "./extension";

export type RulesetFile = { file: Uri, definitions: Definition[] }
export type ReferenceFile = { file: Uri, references: Match[] }
export type VariableFile = { file: Uri, variables: Variables }
export type TranslationFile = { file: Uri, translations: Translations }

export type TypeLookup = {
    [key: string]: DefinitionLookup[];
};

export type DefinitionCompletion = {
    detail?: string;
};

export type DefinitionCompletions = {
    [key: string]: DefinitionCompletion;
};

export class WorkspaceFolderRuleset {
    public definitionsLookup: TypeLookup = {};
    public rulesetFiles: RulesetFile[] = [];
    public variableFiles: VariableFile[] = [];
    public referenceFiles: ReferenceFile[] = [];
    public translationFiles: TranslationFile[] = [];
    private variables: Variables = {};
    private translations: Translations = {};
//    private references: Match[] = [];
    private hierarchy = new WorkspaceFolderRulesetHierarchy(this);

    private diagnosticCollection = languages.createDiagnosticCollection();

    constructor(public workspaceFolder: WorkspaceFolder) {
    }

    public mergeIntoRulesetTree(definitions: Definition[], sourceFile: Uri) {
        this.addRulesetFile(definitions, sourceFile);
    }

    public mergeReferencesIntoRulesetTree(references: Match[], sourceFile: Uri) {
        this.addRulesetReferenceFile(references, sourceFile);
    }

    public mergeVariablesIntoRulesetTree(variables: Variables, sourceFile: Uri) {
        this.addRulesetVariableFile(variables, sourceFile);
    }

    public mergeTranslationsIntoTree(translations: Translation[], sourceFile: Uri) {
        const lookups = this.getTranslationLookups(translations);
        this.addRulesetTranslationFile(lookups, sourceFile);
    }

    public deleteFileFromTree(file: Uri) {
        this.rulesetFiles = this.rulesetFiles.filter(collection => collection.file.path !== file.path);
        this.variableFiles = this.variableFiles.filter(collection => collection.file.path !== file.path);
        this.referenceFiles = this.referenceFiles.filter(collection => collection.file.path !== file.path);
        this.translationFiles = this.translationFiles.filter(collection => collection.file.path !== file.path);
    }

    private getTranslationLookups(translations: Translation[]): Translations {
        const grouped: Translations = {};

        for (const translation of translations) {
            if (!(translation.language in grouped)) {
                grouped[translation.language] = {};
            }

            grouped[translation.language][translation.key] = translation.value;
        }

        return grouped;
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
        const ret: DefinitionLookup = {
            type: definition.type,
            range: definition.range,
            file: sourceFile,
            rangePosition: definition.rangePosition,
            name: definition.name // for autocomplete
        };

        if ('metadata' in definition) {
            ret.metadata = definition.metadata;
        }

        return ret;
    }

    /**
     * Get definitions by their type name
     * @param key
     * @param sourceRuleType
     */
    public getDefinitionsByName(key: string, sourceRuleType: RuleType | undefined): DefinitionLookup[] {
        const overrides = typedProperties.checkForLogicOverrides(key, sourceRuleType);

        let matchingLookups: DefinitionLookup[] = [];
        for (const override of overrides) {
            const finalKey = override.key;

            if (finalKey in this.definitionsLookup) {
                const lookups = this.definitionsLookup[finalKey].filter(lookup => {
                    if (override.target) {
                        return override.target === lookup.type;
                    } else {
                        return typedProperties.isTargetForSourceRule(sourceRuleType, lookup.type);
                    }
                });

                if (lookups.length > 0) {
                    matchingLookups = matchingLookups.concat(lookups);
                }
            }
        }

        return matchingLookups;
    }

    private addRulesetFile(definitions: Definition[], sourceFile: Uri) {
        const rulesetFile = { definitions, file: sourceFile };
        if (this.rulesetFiles.length > 0 && rulesetFile.file) {
            this.rulesetFiles = this.rulesetFiles.filter(tp => tp.file && tp.file.path !== rulesetFile.file.path);
        }
        this.rulesetFiles.push(rulesetFile);
    }

    private addRulesetReferenceFile(references: Match[], sourceFile: Uri) {
        const referenceFile = { references, file: sourceFile };
        if (this.referenceFiles.length > 0 && referenceFile.file) {
            this.referenceFiles = this.referenceFiles.filter(tp => tp.file && tp.file.path !== referenceFile.file.path);
        }
        this.referenceFiles.push(referenceFile);
    }

    private addRulesetVariableFile(variables: Variables, sourceFile: Uri) {
        const variableFile = { variables, file: sourceFile };
        if (this.variableFiles.length > 0 && variableFile.file) {
            this.variableFiles = this.variableFiles.filter(tp => tp.file && tp.file.path !== variableFile.file.path);
        }
        this.variableFiles.push(variableFile);
    }

    private addRulesetTranslationFile(translations: Translations, sourceFile: Uri) {
        const translationFile = { translations, file: sourceFile };
        if (this.translationFiles.length > 0 && translationFile.file) {
            this.translationFiles = this.translationFiles.filter(tp => tp.file && tp.file.path !== translationFile.file.path);
        }
        this.translationFiles.push(translationFile);
    }

    public getVariables(): Variables {
        return this.variables;
    }

    public getReferences(): Match[] {
        return this.referenceFiles.flatMap(file => file.references);
    }

    public getKeysContaining(key: string | undefined, target: string): DefinitionCompletions {
        const targetDefinitions: DefinitionCompletions = {};

        for (const definitionKey in this.definitionsLookup) {
            if (key && !definitionKey.includes(key)) {
                continue;
            }

            const occurrences = this.definitionsLookup[definitionKey];
            for (const def of occurrences) {
                if (def.type === target) {
                    targetDefinitions[definitionKey] = {};

                    const detail = [];
                    if (def.metadata?._name && typeof def.metadata._name === 'string') {
                        detail.push(def.metadata._name);
                    }

                    detail.push(`Source: ${def.file.path.split('/').slice(-1)}`);

                    if (detail.length > 0) {
                        targetDefinitions[definitionKey].detail = detail.join("\n");
                    }

                    break;
                }
            }
        }

        return targetDefinitions;
    }

    public getNumberOfParsedDefinitionFiles(): number {
        return this.rulesetFiles.length;
    }

    public getTranslation(key: string): string | undefined {
        const locale = rulesetResolver.getLocale();

        if (!(locale in this.translations) || !(key in this.translations[locale])) {
            return;
        }

        return this.translations[locale][key];
    }

    public refresh() {
        this.hierarchy.handleDeletes();
        this.createLookups();
    }

    public getDiagnosticCollection(): DiagnosticCollection {
        return this.diagnosticCollection;
    }

    public checkDefinitions(assetUri: Uri) {
        this.diagnosticCollection.clear();
        rulesetDefinitionChecker.clear();
        rulesetDefinitionChecker.init(this.definitionsLookup);

//        logger.debug(`[${(new Date()).toISOString()}] Number of textDocuments in workspace: ${workspace.textDocuments.length}`);
        let problems = 0;
        for (const file of this.referenceFiles) {
            if (file.file.path.startsWith(Uri.joinPath(assetUri, '/').path)) {
                // do not check assets obviously
                continue;
            }

            const diagnostics = rulesetDefinitionChecker.checkFile(file, this.definitionsLookup, this.workspaceFolder.uri.path);

            // logger.debug(`diagnostic: ${file.file.path} has ${diagnostics.length} diagnostics from ${file.references.length} references`);
            problems += diagnostics.length;
            this.diagnosticCollection.set(Uri.file(file.file.path), diagnostics);
        }

        logger.info(`Total problems found: ${problems}`);

        return true;
    }

    private createLookups() {
        this.createDefinitionLookup();
        this.createVariableLookup();
        this.createTranslationLookup();
    }

    private createDefinitionLookup() {
        this.definitionsLookup = {};

        this.rulesetFiles.forEach((ruleset) => {
            this.definitionsLookup = deepmerge(
                this.definitionsLookup,
                this.getLookups(ruleset.definitions, ruleset.file)
            );
        });

        logger.debug('Total number of (unique) definitions: ', Object.keys(this.definitionsLookup).length);
    }

    private createVariableLookup () {
        this.variables = {};

        this.variableFiles.forEach((file) => {
            this.variables = deepmerge(
                this.variables,
                file.variables
            );
        });

    //    logger.debug('Number of variables', Object.keys(this.variables).length);
    }

    private createTranslationLookup () {
        this.translations = {};

        this.translationFiles.forEach((file) => {
            this.translations = deepmerge(
                this.translations,
                file.translations
            );
        });

        // logger.debug(`Number of translations for ${this.getLocale()}: ${Object.keys(this.translations[locale]).length}`);
    }
}
