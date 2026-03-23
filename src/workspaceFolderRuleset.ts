import { DiagnosticCollection, languages, Uri, WorkspaceFolder } from 'vscode';
import {
    RuleType,
    Definition,
    DefinitionLookup,
    Variables,
    Translation,
    Translations,
    Match,
    LogicDataEntry,
} from './rulesetTree';
import { logger } from './logger';
import { typedProperties } from './typedProperties';
import { rulesetDefinitionChecker } from './rulesetDefinitionChecker';
import { WorkspaceFolderRulesetHierarchy } from './workspaceFolderRulesetHierarchy';
import { rulesetResolver } from './extension';
import { FilesWithDiagnostics } from './logic/logicHandler';
import { perfTimer } from './performanceTimer';

export type RulesetFile = { file: Uri; definitions: Definition[] };
export type ReferenceFile = { file: Uri; references: Match[] };
export type VariableFile = { file: Uri; variables: Variables };
export type TranslationFile = { file: Uri; translations: Translations };
export type LogicDataFile = { file: Uri; logicData: { [key: string]: LogicDataEntry[] } };

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
    public rulesetFiles = new Map<string, RulesetFile>();
    public variableFiles = new Map<string, VariableFile>();
    public referenceFiles = new Map<string, ReferenceFile>();
    public translationFiles = new Map<string, TranslationFile>();
    public logicDataFiles = new Map<string, LogicDataFile>();
    private variables: Variables = {};
    private translations: Translations = {};
    //    private references: Match[] = [];
    private hierarchy = new WorkspaceFolderRulesetHierarchy(this);

    private diagnosticCollection = languages.createDiagnosticCollection();

    constructor(public workspaceFolder: WorkspaceFolder) {}

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

    public mergeLogicDataIntoTree(logicData: LogicDataEntry[], sourceFile: Uri) {
        const lookups = this.getLogicDataLookups(logicData);
        this.addRulesetLogicDataFile(lookups, sourceFile);
    }

    public deleteFileFromTree(file: Uri) {
        this.rulesetFiles.delete(file.path);
        this.variableFiles.delete(file.path);
        this.referenceFiles.delete(file.path);
        this.translationFiles.delete(file.path);
        this.logicDataFiles.delete(file.path);
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
        const grouped: { [key: string]: LogicDataEntry[] } = {};

        for (const entry of logicData) {
            if (!(entry.path in grouped)) {
                grouped[entry.path] = [];
            }

            grouped[entry.path].push(entry);
        }

        return grouped;
    }

    private getDefinitionLookup(definition: Definition, sourceFile: Uri): DefinitionLookup {
        const ret: DefinitionLookup = {
            type: definition.type,
            range: definition.range,
            file: sourceFile,
            rangePosition: definition.rangePosition,
            name: definition.name, // for autocomplete
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
                const lookups = this.definitionsLookup[finalKey].filter((lookup) => {
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
        this.rulesetFiles.set(sourceFile.path, { definitions, file: sourceFile });
    }

    private addRulesetReferenceFile(references: Match[], sourceFile: Uri) {
        this.referenceFiles.set(sourceFile.path, { references, file: sourceFile });
    }

    private addRulesetVariableFile(variables: Variables, sourceFile: Uri) {
        this.variableFiles.set(sourceFile.path, { variables, file: sourceFile });
    }

    private addRulesetTranslationFile(translations: Translations, sourceFile: Uri) {
        this.translationFiles.set(sourceFile.path, { translations, file: sourceFile });
    }

    private addRulesetLogicDataFile(logicData: { [key: string]: LogicDataEntry[] }, sourceFile: Uri) {
        this.logicDataFiles.set(sourceFile.path, { logicData, file: sourceFile });
    }

    public getVariables(): Variables {
        return this.variables;
    }

    public getReferences(): Match[] {
        return [...this.referenceFiles.values()].flatMap((file) => file.references);
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
                        detail.push(`File: ${def.metadata._name}`);
                    }

                    detail.push(`Source: ${def.file.path.split('/').slice(-1)}`);

                    if (detail.length > 0) {
                        targetDefinitions[definitionKey].detail = detail.join('  \n');
                    }

                    break;
                }
            }
        }

        return targetDefinitions;
    }

    public getNumberOfParsedDefinitionFiles(): number {
        return this.rulesetFiles.size;
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
        perfTimer.start('phase.createLookups');
        this.createLookups();
        perfTimer.stop('phase.createLookups');
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
        let problems = 0;
        const diagnosticsPerFile: FilesWithDiagnostics = {};
        for (const file of this.referenceFiles.values()) {
            if (file.file.path.startsWith(Uri.joinPath(assetUri, '/').path)) {
                // do not check assets obviously, but do store its logic data
                rulesetDefinitionChecker.checkLogicData(this, file, [], this.hierarchy);
                continue;
            }

            const diagnostics = rulesetDefinitionChecker.checkFile(
                file,
                this,
                this.workspaceFolder.uri.path,
                this.hierarchy,
            );

            // logger.debug(`diagnostic: ${file.file.path} has ${diagnostics.length} diagnostics from ${file.references.length} references`);
            problems += diagnostics.length;
            diagnosticsPerFile[file.file.path] = diagnostics;
            // this.diagnosticCollection.set(Uri.file(file.file.path), diagnostics);
        }

        const combinedDiagnosticsPerFile = rulesetDefinitionChecker.checkRelationLogic(diagnosticsPerFile);

        for (const file in combinedDiagnosticsPerFile) {
            this.diagnosticCollection.set(Uri.file(file), combinedDiagnosticsPerFile[file]);
        }

        logger.info(`Total problems found: ${problems}`);
    }

    public getLogicData(file: Uri) {
        const logicFile = this.logicDataFiles.get(file.path);
        if (logicFile && Object.keys(logicFile.logicData).length > 0) {
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
        const lookup: TypeLookup = {};
        for (const file of this.rulesetFiles.values()) {
            for (const def of file.definitions) {
                const arr = lookup[def.name];
                const entry = this.getDefinitionLookup(def, file.file);
                if (arr) {
                    arr.push(entry);
                } else {
                    lookup[def.name] = [entry];
                }
            }
        }
        this.definitionsLookup = lookup;

        logger.debug('Total number of (unique) definitions: ', Object.keys(this.definitionsLookup).length);
    }

    private createVariableLookup() {
        const vars: Variables = {};
        for (const file of this.variableFiles.values()) {
            for (const key in file.variables) {
                vars[key] = file.variables[key];
            }
        }
        this.variables = vars;
    }

    private createTranslationLookup() {
        const translations: Translations = {};
        for (const file of this.translationFiles.values()) {
            for (const locale in file.translations) {
                const localeTranslations = (translations[locale] ??= {});
                const fileLocale = file.translations[locale];
                for (const key in fileLocale) {
                    localeTranslations[key] = fileLocale[key];
                }
            }
        }
        this.translations = translations;

        logger.debug(
            `Number of translations for ${rulesetResolver.getLocale()}: ${
                Object.keys(this.translations[rulesetResolver.getLocale()] ?? {}).length
            }`,
        );
    }
}
