import { DiagnosticCollection, languages, Uri, workspace, WorkspaceFolder } from "vscode";
import { RuleType, Definition, DefinitionLookup, Variables, Translation, Translations, Match, LogicDataEntry } from "./rulesetTree";
import * as deepmerge from 'deepmerge';
import { logger } from "./logger";
import { typedProperties } from "./typedProperties";
import { rulesetDefinitionChecker } from "./rulesetDefinitionChecker";
import { WorkspaceFolderRulesetHierarchy } from "./workspaceFolderRulesetHierarchy";
import { FilesWithDiagnostics } from "./logic/logicHandler";

export type RulesetFile = { file: Uri, definitions: Definition[] }
export type ReferenceFile = { file: Uri, references: Match[] }
export type VariableFile = { file: Uri, variables: Variables }
export type TranslationFile = { file: Uri, translations: Translations }
export type LogicDataFile = { file: Uri, logicData: {[key: string]: LogicDataEntry[]} }

export type TypeLookup = {
    [key: string]: DefinitionLookup[];
};

export class WorkspaceFolderRuleset {
    public definitionsLookup: TypeLookup = {};
    public rulesetFiles: RulesetFile[] = [];
    public variableFiles: VariableFile[] = [];
    public referenceFiles: ReferenceFile[] = [];
    public translationFiles: TranslationFile[] = [];
    public logicDataFiles: LogicDataFile[] = [];
    private variables: Variables = {};
    private translations: Translations = {};
//    private references: Match[] = [];
    private hierarchy = new WorkspaceFolderRulesetHierarchy(this);

    private diagnosticCollection = languages.createDiagnosticCollection();

    constructor(public workspaceFolder: WorkspaceFolder) {
    }

    public mergeIntoRulesetTree(definitions: Definition[], sourceFile: Uri) {
        this.addRulesetFile(definitions, sourceFile || null);
    }

    public mergeReferencesIntoRulesetTree(references: Match[], sourceFile: Uri) {
        this.addRulesetReferenceFile(references, sourceFile || null);
    }

    public mergeVariablesIntoRulesetTree(variables: Variables, sourceFile: Uri) {
        this.addRulesetVariableFile(variables, sourceFile || null);
    }

    public mergeTranslationsIntoTree(translations: Translation[], sourceFile: Uri) {
        const lookups = this.getTranslationLookups(translations);
        this.addRulesetTranslationFile(lookups, sourceFile || null);
    }

    public mergeLogicDataIntoTree(logicData: LogicDataEntry[], sourceFile: Uri) {
        const lookups = this.getLogicDataLookups(logicData);
        this.addRulesetLogicDataFile(lookups, sourceFile || null);
    }

    public deleteFileFromTree(file: Uri) {
        delete this.rulesetFiles[this.rulesetFiles.findIndex(collection => collection.file.path === file.path)];
        delete this.variableFiles[this.variableFiles.findIndex(collection => collection.file.path === file.path)];
        delete this.referenceFiles[this.referenceFiles.findIndex(collection => collection.file.path === file.path)];
        delete this.translationFiles[this.translationFiles.findIndex(collection => collection.file.path === file.path)];
        delete this.logicDataFiles[this.logicDataFiles.findIndex(collection => collection.file.path === file.path)];
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

    private getLogicDataLookups(logicData: LogicDataEntry[]) {
        const grouped: {[key: string]: LogicDataEntry[]} = {};

        for (const entry of logicData) {
            if (!(entry.path in grouped)) {
                grouped[entry.path] = [];
            }

           grouped[entry.path].push(entry);
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
            rangePosition: definition.rangePosition
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

    private addRulesetLogicDataFile(logicData: { [key: string]: LogicDataEntry[]; }, sourceFile: Uri) {
        const logicDataFile = { logicData, file: sourceFile };
        if (this.logicDataFiles.length > 0 && logicDataFile.file) {
            this.logicDataFiles = this.logicDataFiles.filter(tp => tp.file && tp.file.path !== logicDataFile.file.path);
        }
        this.logicDataFiles.push(logicDataFile);
    }

    public getVariables(): Variables {
        return this.variables;
    }

    public getNumberOfParsedDefinitionFiles(): number {
        return this.rulesetFiles.length;
    }

    public getTranslation(key: string): string {
        const locale = this.getLocale();

        if (!(locale in this.translations) || !(key in this.translations[locale])) {
            return `No translation found for locale '${locale}' '${key}'!`;
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

    // TODO refactor this to checkFile (because it does more now), also move it
    public checkDefinitions(assetUri: Uri) {
        this.diagnosticCollection.clear();
        rulesetDefinitionChecker.clear();
        rulesetDefinitionChecker.init(this.definitionsLookup);

//        logger.debug(`[${(new Date()).toISOString()}] Number of textDocuments in workspace: ${workspace.textDocuments.length}`);
        const diagnosticsPerFile: FilesWithDiagnostics = {};
        for (const file of this.referenceFiles) {
            if (file.file.path.startsWith(Uri.joinPath(assetUri, '/').path)) {
                // do not check assets obviously
                continue;
            }

            const diagnostics = rulesetDefinitionChecker.checkFile(file, this, this.workspaceFolder.uri.path);

            // logger.debug(`diagnostic: ${file.file.path} has ${diagnostics.length} diagnostics from ${file.references.length} references`);
            diagnosticsPerFile[file.file.path] = diagnostics;
            // this.diagnosticCollection.set(Uri.file(file.file.path), diagnostics);
        }

        const combinedDiagnosticsPerFile = rulesetDefinitionChecker.checkRelationLogic(diagnosticsPerFile);

        for (const file in combinedDiagnosticsPerFile) {
            this.diagnosticCollection.set(Uri.file(file), combinedDiagnosticsPerFile[file]);
        }
    }

    public getLogicData(file: Uri) {
        const logicFile = this.logicDataFiles.find(logicFile => file === logicFile.file && Object.keys(logicFile.logicData).length > 0);
        if (logicFile) {
            return logicFile.logicData;
        }

        return;
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

    private getLocale (): string {
        return workspace.getConfiguration('oxcYamlHelper').get<string>('translationLocale') ?? 'en-US';
    }
}