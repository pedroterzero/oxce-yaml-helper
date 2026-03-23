import { Diagnostic, DiagnosticSeverity, Range, Uri, workspace } from 'vscode';
import { Match } from './rulesetTree';
import { ReferenceFile, TypeLookup, WorkspaceFolderRuleset } from './workspaceFolderRuleset';
import { soundTypeLinks, spriteTypeLinks, typeLinks, typeLinksPossibleKeys } from './definitions/typeLinks';
import { rulesetResolver } from './extension';
import { logger } from './logger';
import { FilesWithDiagnostics, LogicHandler } from './logic/logicHandler';
import { mergeAndConcat } from 'merge-anything';
import { typeHintMessages } from './definitions/typeHintMessages';
import { typedProperties } from './typedProperties';
import { WorkspaceFolderRulesetHierarchy } from './workspaceFolderRulesetHierarchy';
import { FileNotInWorkspaceError } from './rulesetResolver';
import { perfTimer } from './performanceTimer';
import { ReferenceClassifier } from './referenceClassifier';
import { DuplicateChecker } from './duplicateChecker';

type TypeMatchResult = {
    match: boolean;
    expected: string[];
    found: string[];
};

export class RulesetDefinitionChecker {
    private problemsByPath: { [key: string]: number } = {};

    private noWarnAboutIncorrectType = Object.keys(spriteTypeLinks).concat(Object.keys(soundTypeLinks));

    private logicHandler = new LogicHandler();
    private classifier = new ReferenceClassifier();
    private duplicateChecker = new DuplicateChecker();

    public init(lookup: TypeLookup) {
        perfTimer.start('checker.checkDefinitions');
        this.duplicateChecker.checkDefinitions(lookup);
        perfTimer.stop('checker.checkDefinitions');
        this.logicHandler = new LogicHandler();
    }

    public checkFile(
        file: ReferenceFile,
        ruleset: WorkspaceFolderRuleset,
        _workspacePath: string,
        hierarchy: WorkspaceFolderRulesetHierarchy,
    ): Diagnostic[] {
        perfTimer.start('checker.checkFile');
        const diagnostics: Diagnostic[] = [];

        perfTimer.start('checker.checkReferences');
        this.checkReferences(file, ruleset.definitionsLookup, diagnostics);
        perfTimer.stop('checker.checkReferences');
        this.duplicateChecker.addDuplicateDefinitions(file, diagnostics);

        this.checkLogicData(ruleset, file, diagnostics, hierarchy);

        perfTimer.stop('checker.checkFile');
        return diagnostics;
    }

    /**
     * Separate call to check logic data to allow data to be collected from vanilla assets
     * @param ruleset
     * @param file
     * @param diagnostics
     * @param hierarchy
     */
    public checkLogicData(
        ruleset: WorkspaceFolderRuleset,
        file: ReferenceFile,
        diagnostics: Diagnostic[],
        hierarchy: WorkspaceFolderRulesetHierarchy,
    ) {
        let logicData;
        if ((logicData = ruleset.getLogicData(file.file))) {
            // console.log(`checking! ${file.file.path}`);
            this.logicHandler.check(file.file, diagnostics, logicData, hierarchy);
        }
    }

    public checkRelationLogic(diagnosticsPerFile: FilesWithDiagnostics): FilesWithDiagnostics {
        const additionalFilesWithDiagnostics = this.logicHandler.checkRelationLogic();

        return mergeAndConcat(diagnosticsPerFile, additionalFilesWithDiagnostics) as FilesWithDiagnostics;
    }

    private checkReferences(file: ReferenceFile, lookup: TypeLookup, diagnostics: Diagnostic[]) {
        for (const ref of file.references) {
            if (!this.classifier.typeExists(ref)) {
                continue;
            }

            let isCheckableTranslation = false;
            if (this.classifier.isCheckableTranslatableString(ref)) {
                isCheckableTranslation = true;

                // check if the reference points to an existing translation
                this.checkForValidTranslationReference(ref, file.file, diagnostics);
            }

            if (ref.path in typeLinks && typeLinks[ref.path].includes('_dummy_')) {
                // dummy field indicates custom logic, so don't process the rest of this function
                this.logicHandler.storeRelationLogicReference(ref, file);
                if (typeLinks[ref.path].length === 1) {
                    continue;
                }
            }

            if (isCheckableTranslation) {
                continue;
            }
            const possibleKeys = this.getPossibleKeys(ref);
            if (possibleKeys.filter((key) => key in lookup).length === 0) {
                // can never match because the key simply does not exist for any type
                this.addReferenceDiagnostic(ref, diagnostics, this.nonexistantDefinitionMessage);
            } else {
                const result = this.checkForCorrectTarget(ref, possibleKeys, lookup);

                if (result && !result.match) {
                    this.addReferenceDiagnostic(ref, diagnostics, this.incorrectTypeMessage, result);
                }
            }
        }
    }

    private checkForValidTranslationReference(ref: Match, file: Uri, diagnostics: Diagnostic[]) {
        // console.log(`checking translation ${ref.path} => ${ref.key}`);
        // const translation = rulesetResolver.getTranslationForKey(ref.key, file, true);
        let translation;
        try {
            translation = rulesetResolver.getTranslationForKey(ref.key, file, true);
        } catch (error) {
            if (error instanceof FileNotInWorkspaceError) {
                // file not in workspace, just ignore it (it will spam like crazy, so don't log)
                // logger.debug(`File not in workspace (ignoring): ${file.path}`);
                // return;
            } else {
                throw error;
            }
        }

        if (translation === undefined) {
            this.addReferenceDiagnostic(
                ref,
                diagnostics,
                () => `No translation entry found for "${ref.key}" (${ref.path})`,
            );
        }
    }

    private getPossibleKeys(ref: Match) {
        if (ref.path in typeLinksPossibleKeys) {
            return typeLinksPossibleKeys[ref.path](ref.key);
        }

        return [ref.key];
    }

    /**
     * If we found a match, check that the definition found is a valid target for the reference
     * @param ref
     * @param possibleKeys
     * @param lookup
     */
    private checkForCorrectTarget(ref: Match, possibleKeys: string[], lookup: TypeLookup) {
        // TODO check if we still need this with the new logic checker?
        const override = this.checkForLogicOverrides(ref, lookup);
        if (typeof override !== 'undefined') {
            return override;
        }

        let retval;
        let values;
        if (ref.path in typeLinks) {
            retval = this.checkForTypeLinkMatch(typeLinks[ref.path], possibleKeys, lookup);
        } else if ((values = typedProperties.isRegexTypeLink(ref.path))) {
            retval = this.checkForTypeLinkMatch(values, possibleKeys, lookup);
        }

        return retval;
    }

    private checkForLogicOverrides(ref: Match, lookup: TypeLookup) {
        const overrides = typedProperties.checkForMetadataLogicOverrides(ref);
        if (overrides) {
            for (const override of overrides) {
                if (override.target) {
                    return this.checkForTypeLinkMatch([override.target], [override.key], lookup);
                }

                // TODO handle key overrides?
            }

            return false;
        }

        return;
    }

    private checkForTypeLinkMatch(
        rawTypeLinksArg: string[],
        possibleKeys: string[],
        lookup: TypeLookup,
    ): TypeMatchResult {
        let rawTypeLinks = [...rawTypeLinksArg];
        if (rawTypeLinks.includes('_dummy_')) {
            // shortcut for dummy (custom logic)
            if (rawTypeLinks.length === 1) {
                return { match: false, expected: [], found: [] };
            }
            rawTypeLinks = rawTypeLinks.filter((link) => link !== '_dummy_');
        }

        const { matchType, typeValues: typeLinks } = this.processTypeLinks(rawTypeLinks, possibleKeys);

        const matches: { [key: string]: boolean } = {};
        // store what we expect
        const expected: { [key: string]: boolean } = {};
        // store what we found
        const found: { [key: string]: boolean } = {};
        for (const target in typeLinks) {
            expected[target] = true;
            for (const key of typeLinks[target]) {
                if (key in lookup) {
                    for (const result of lookup[key]) {
                        if (target === result.type) {
                            matches[target] = true;
                        } else {
                            found[result.type] = true;
                        }
                    }
                }
            }
        }

        if (matchType === 'any') {
            // if we have found any match, it's OK
            return {
                match: Object.values(matches).length > 0,
                expected: Object.keys(expected),
                found: Object.keys(found),
            };
        } else {
            // if we have found the number of matches we expect (1 per target typeLink), it's OK
            return {
                match: Object.values(matches).length === Object.values(typeLinks).length,
                expected: Object.keys(expected),
                found: Object.keys(found),
            };
        }
    }

    private processTypeLinks(rawTypeLinks: string[], rawPossibleKeys: string[]) {
        const keyMatchType = rawPossibleKeys.includes('_all_') ? 'all' : 'any';
        const possibleKeys = rawPossibleKeys.filter((key) => !['_any_', '_all_'].includes(key));

        const matchType = rawTypeLinks.includes('_any_') ? 'any' : 'all';
        const typeLinks = rawTypeLinks.filter((key) => !['_any_', '_all_'].includes(key));

        if (keyMatchType === 'all' && typeLinks.length !== possibleKeys.length) {
            logger.error(
                `Number of typeLinks fields (${JSON.stringify(
                    typeLinks,
                )}) should match number of possibleKeys (${JSON.stringify(possibleKeys)})`,
            );
            // throw new Error(`Number of typeLinks fields (${JSON.stringify(rawTypeLinks)}) should match number of possibleKeys (${JSON.stringify(possibleKeys)})`);
        }

        const typeValues: { [key: string]: string[] } = {};
        for (const index in typeLinks) {
            if (keyMatchType === 'all') {
                typeValues[typeLinks[index]] = [possibleKeys[index]];
            } else {
                typeValues[typeLinks[index]] = possibleKeys;
            }
        }

        return { matchType, typeValues };
    }

    private addReferenceDiagnostic(
        ref: Match,
        diagnostics: Diagnostic[],
        messageFunction: (ref: Match, target?: TypeMatchResult) => string,
        target?: TypeMatchResult,
    ) {
        if (!ref.rangePosition) {
            throw new Error('rangePosition missing');
        }

        const range = new Range(...ref.rangePosition[0], ...ref.rangePosition[1]);

        if ('path' in ref) {
            if (!(ref.path in this.problemsByPath)) {
                this.problemsByPath[ref.path] = 0;
            }

            this.problemsByPath[ref.path]++;

            if (workspace.getConfiguration('oxcYamlHelper').get<string>('validateCategories') === 'no') {
                if (['items.categories[]' /*, 'manufacture.category'*/].indexOf(ref.path) !== -1) {
                    return;
                }
            }
        }

        let message = messageFunction.bind(this)(ref, target);
        if (ref.path in typeHintMessages) {
            message += `\nHint: ${typeHintMessages[ref.path](ref.key).trim()}`;
        }

        diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Warning));
    }

    private nonexistantDefinitionMessage(ref: Match) {
        let message = `"${ref.key}" does not exist (${ref.path})`;
        if (ref.metadata && ref.metadata.type) {
            message += ` for ${ref.metadata.type}`;
        }

        return message;
    }

    private incorrectTypeMessage(ref: Match, target?: TypeMatchResult) {
        if (this.noWarnAboutIncorrectType.includes(ref.path)) {
            return this.nonexistantDefinitionMessage(ref);
        }

        let message = `"${ref.key}" is an incorrect type for ${ref.path}.`;
        if (target) {
            // const expected = Object.keys(expected).length
            message += ` Expected`;
            if (target.expected.length === 1) {
                message += ` "${target.expected[0]}"`;
            } else {
                message += ` one of "${target.expected.join('", "')}"`;
            }
            message += `, found: "${target.found.join('", "')}"`;
        }

        return message;
    }

    public matchesBuiltinTypePathRegex(path: string) {
        return this.classifier.matchesBuiltinTypePathRegex(path);
    }

    public getProblemsByPath() {
        return this.problemsByPath;
    }

    public clear() {
        this.problemsByPath = {};
    }
}

export const rulesetDefinitionChecker = new RulesetDefinitionChecker();
