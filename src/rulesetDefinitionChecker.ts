import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Location, Range, Uri, workspace } from "vscode";
import { DefinitionLookup, Match } from "./rulesetTree";
import { ReferenceFile, TypeLookup, WorkspaceFolderRuleset } from "./workspaceFolderRuleset";
import { soundTypeLinks, spriteTypeLinks, typeLinks, typeLinksPossibleKeys } from "./definitions/typeLinks";
import { builtinResourceIds, builtinTypes } from "./definitions/builtinTypes";
import { ignoreTypes } from "./definitions/ignoreTypes";
import { stringTypes } from "./definitions/stringTypes";
import { rulesetResolver } from "./extension";
import { logger } from "./logger";
import { FilesWithDiagnostics, LogicHandler } from "./logic/logicHandler";
import { mergeAndConcat } from "merge-anything";
import { typeHintMessages } from "./definitions/typeHintMessages";
import { typedProperties } from "./typedProperties";
import { WorkspaceFolderRulesetHierarchy } from "./workspaceFolderRulesetHierarchy";

type Duplicates = {
    [key: string]: DefinitionLookup[];
};

type DuplicateMatches = {
    key: string,
    definition: DefinitionLookup,
    duplicates: DefinitionLookup[]
};

type TypeMatchResult = {
    match: boolean,
    expected: string[],
    found: string[]
};

export class RulesetDefinitionChecker {
    private problemsByPath: {[key: string]: number} = {};
    private duplicatesPerFile: {[key: string]: DuplicateMatches[]} = {};

    private ignoreDefinitionRegexes: RegExp[] = [
        /^extraSprites\.files\.\d+$/,
        /^extended\.tags\.([a-zA-Z]+)$/,
        /^facilities\.provideBaseFunc$/,
        /^terrains\.mapBlocks\[\]$/,
    ];

    private builtinTypeRegexes: {regex: RegExp, values: string[]}[] = [];
    private stringTypeRegexes: RegExp[] = [];
    private ignoreTypesRegexes: RegExp[] = [];

    private ignoreTypeValues: {[key: string]: string[]} = {
        'extraSprites': ['BASEBITS.PCK', 'BIGOBS.PCK', 'FLOOROB.PCK', 'HANDOB.PCK', 'INTICON.PCK', 'Projectiles', 'SMOKE.PCK'],
        'extraSounds': ['BATTLE.CAT'],
    };

    private noWarnAboutIncorrectType = Object.keys(spriteTypeLinks).concat(Object.keys(soundTypeLinks));

    private logicHandler = new LogicHandler;

    public constructor() {
        this.loadRegexes();
    }

    public init(lookup: TypeLookup) {
        this.checkDefinitions(lookup);
        this.logicHandler = new LogicHandler;
    }

    public checkFile(file: ReferenceFile, ruleset: WorkspaceFolderRuleset, _workspacePath: string, hierarchy: WorkspaceFolderRulesetHierarchy): Diagnostic[] {
        const diagnostics : Diagnostic[] = [];

        this.checkReferences(file, ruleset.definitionsLookup, diagnostics);
        this.addDuplicateDefinitions(file, diagnostics);

        this.checkLogicData(ruleset, file, diagnostics, hierarchy);

        return diagnostics;
    }

    /**
     * Separate call to check logic data to allow data to be collected from vanilla assets
     * @param ruleset
     * @param file
     * @param diagnostics
     * @param hierarchy
     */
    public checkLogicData(ruleset: WorkspaceFolderRuleset, file: ReferenceFile, diagnostics: Diagnostic[], hierarchy: WorkspaceFolderRulesetHierarchy) {
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

    private addDuplicateDefinitions(file: ReferenceFile, diagnostics: Diagnostic[]) {
        if (!(file.file.path in this.duplicatesPerFile)) {
            return;
        }

        const duplicates = this.duplicatesPerFile[file.file.path];
        for (const duplicate of duplicates) {
            const relatedInformation = [];
            for (const dupdef of duplicate.duplicates) {
                relatedInformation.push(
                    new DiagnosticRelatedInformation(new Location(dupdef.file, new Range(...dupdef.rangePosition[0], ...dupdef.rangePosition[1])), 'also defined here')
                );
            }

            const message = `${duplicate.definition.type} ${duplicate.key} is duplicate (add # ignoreDuplicate after this to ignore this entry)`;

            const range = new Range(...duplicate.definition.rangePosition[0], ...duplicate.definition.rangePosition[1]);
            diagnostics.push({
                range,
                message,
                severity: DiagnosticSeverity.Warning,
                relatedInformation
            });
        }

        // appendFile(workspacePath + '/messages.txt', doc.fileName.slice(workspacePath.length + 1) + "\n==========\n" + messages.join("\n") + "\n\n", () => { return; });
    }

    private checkReferences(file: ReferenceFile, lookup: TypeLookup, diagnostics: Diagnostic[]) {
        for (const ref of file.references) {
            if (!this.typeExists(ref)) {
                continue;
            }

            if (ref.path in typeLinks && typeLinks[ref.path].includes('_dummy_')) {
                // dummy field indicates custom logic, so don't process the rest of this function
                this.logicHandler.storeRelationLogicReference(ref, file);
                continue;
            }

            const possibleKeys = this.getPossibleKeys(ref);
            if (possibleKeys.filter(key => key in lookup).length === 0) {
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

    public checkDefinitions (lookup: TypeLookup) {
        this.duplicatesPerFile = {};

        if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('findDuplicateDefinitions')) {
            return;
        }

        logger.debug(`Existing lookups: ${Object.keys(lookup).length}`);

        const dupes = this.getDuplicatesByKeyAndType(lookup);
        logger.debug(`Number of types that have duplicates: ${Object.keys(dupes).length}`);

        for (const type in dupes) {
            for (const defs of Object.values(dupes[type])) {
                this.groupDuplicatesByFile(defs, type);
            }
        }
    }

    private groupDuplicatesByFile(defs: DefinitionLookup[], type: string) {
        for (const idx1 in defs) {
            // first loop, build the message for defs that is not this one
            const def = defs[idx1];

            const mydefs = [];
            for (const idx2 in defs) {
                // inner loop, get defs that aren't this one
                if (idx1 !== idx2) {
                    mydefs.push(defs[idx2]);
                }
            }

            if (!(def.file.path in this.duplicatesPerFile)) {
                this.duplicatesPerFile[def.file.path] = [];
            }

            this.duplicatesPerFile[def.file.path].push({
                key: type,
                definition: def,
                duplicates: mydefs,
            });
        }
    }

    private getDuplicatesByKeyAndType(lookup: TypeLookup) {
        const dupes: {[key: string]: {[key: string]: DefinitionLookup[]}} = {};
        const hierarchy = rulesetResolver.getRulesetHierarchy();

        for (const key in lookup) {
            const duplicates = this.getDuplicateKeys(lookup[key], key, hierarchy);
            if (!duplicates) {
                continue;
            }

            const grouped = this.groupDuplicates(duplicates);
            if (Object.keys(grouped).length) {
                dupes[key] = grouped;
            }
        }

        return dupes;
    }

    private getDuplicateKeys (keyDefs: DefinitionLookup[], key: string, hierarchy: { [key: string]: Uri; }): Duplicates | undefined {
        const duplicates: Duplicates = {};

        definitions:
        for (const def of keyDefs) {
            if (def.metadata && '_comment' in def.metadata && (def.metadata._comment as string).includes('ignoreDuplicate')) {
                // explicitly ignored by comment
                continue;
            }

            if (def.type in this.ignoreTypeValues && this.ignoreTypeValues[def.type].indexOf(key) !== -1) {
                continue;
            }
            for (const re of this.ignoreDefinitionRegexes) {
                if (re.exec(def.type)) {
                    continue definitions;
                }
            }

            if (def.file.path.indexOf(hierarchy.mod.path) !== 0) {
                continue;
            }

            if (!(def.type in duplicates)) {
                duplicates[def.type] = [];
            }

            duplicates[def.type].push(def);
        }

        return duplicates;
    }

    private groupDuplicates(duplicates: Duplicates) {
        const ret: {[key: string]: DefinitionLookup[]} = {};

        for (const type in duplicates) {
            const typeDupes = duplicates[type];
            if (typeDupes.length > 1) {
                ret[type] = typeDupes;
            }
        }

        return ret;
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

    private checkForLogicOverrides (ref: Match, lookup: TypeLookup) {
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

    private checkForTypeLinkMatch(rawTypeLinks: string[], possibleKeys: string[], lookup: TypeLookup): TypeMatchResult {
        if (rawTypeLinks.includes('_dummy_')) {
            // shortcut for dummy (custom logic)
            return {match: false, expected: [], found: []};
        }

        const {matchType, typeValues: typeLinks} = this.processTypeLinks(rawTypeLinks, possibleKeys);

        const matches: {[key: string]: boolean} = {};
        // store what we expect
        const expected: {[key: string]: boolean} = {};
        // store what we found
        const found: {[key: string]: boolean} = {};
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
            return {match: Object.values(matches).length > 0, expected: Object.keys(expected), found: Object.keys(found)};
        } else {
            // if we have found the number of matches we expect (1 per target typeLink), it's OK
            return {match: Object.values(matches).length === Object.values(typeLinks).length, expected: Object.keys(expected), found: Object.keys(found)};
        }
    }

    private processTypeLinks(rawTypeLinks: string[], rawPossibleKeys: string[]) {
        const keyMatchType = rawPossibleKeys.includes('_all_') ? 'all' : 'any';
        const possibleKeys = rawPossibleKeys.filter(key => !['_any_', '_all_'].includes(key));

        const matchType = rawTypeLinks.includes('_any_') ? 'any' : 'all';
        const typeLinks = rawTypeLinks.filter(key => !['_any_', '_all_'].includes(key));

        if (keyMatchType === 'all' && typeLinks.length !== possibleKeys.length) {
            logger.error(`Number of typeLinks fields (${JSON.stringify(typeLinks)}) should match number of possibleKeys (${JSON.stringify(possibleKeys)})`);
            // throw new Error(`Number of typeLinks fields (${JSON.stringify(rawTypeLinks)}) should match number of possibleKeys (${JSON.stringify(possibleKeys)})`);
        }

        const typeValues: {[key: string]: string[]} = {};
        for (const index in typeLinks) {
            if (keyMatchType === 'all') {
                typeValues[typeLinks[index]] = [possibleKeys[index]];
            } else {
                typeValues[typeLinks[index]] = possibleKeys;
            }
        }

        return {matchType, typeValues};
    }

    private addReferenceDiagnostic(ref: Match, diagnostics: Diagnostic[], messageFunction: (ref: Match, target?: TypeMatchResult) => string, target?: TypeMatchResult) {
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
                if (['items.categories', 'manufacture.category'].indexOf(ref.path) !== -1) {
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

    private typeExists(ref: Match): boolean {
        if (ref.path.match(/^[a-z]+\.delete$/i)) {
            // we can't really check deletes, because the types are deleted by the time we get here. TODO to fix even that
            return false;
        }
        if (ref.path.startsWith('extraStrings.') || ref.path.startsWith('extended.scripts.')) {
            // ignore extraStrings for now(?)
            return false;
        }
        if (this.checkForIgnoredType(ref.path)) {
            // ignore these assorted types for now
            return false;
        }
        if (this.isExtraStringType(ref.path)) {
            // ignore extraStrings for now
            return false;
        }
        if (ref.path in builtinTypes && builtinTypes[ref.path].indexOf(ref.key) !== -1) {
            return false;
        } else if (this.matchesBuiltinTypeRegex(ref.path, ref.key)) {
            return false;
        }

        if (ref.path in builtinResourceIds) {
            const [min, max] = builtinResourceIds[ref.path];

            if (parseInt(ref.key) >= min && parseInt(ref.key) <= max) {
              // built in resource id
              return false;
            }
        }

        return true;
    }

    private isExtraStringType(path: string) {
        if (stringTypes.includes(path)) {
            return true;
        }

        for (const regex of this.stringTypeRegexes) {
            if (regex.exec(path)) {
                return true;
            }
        }

        return false;
    }

    private checkForIgnoredType(path: string) {
        if (ignoreTypes.includes(path)) {
            return true;
        }

        for (const re of this.ignoreTypesRegexes) {
            if (re.exec(path)) {
                return true;
            }
        }

        return false;
    }

    private matchesBuiltinTypeRegex(path: string, key: string): boolean {
        for (const item of this.builtinTypeRegexes) {
            if (item.regex.exec(path) && item.values.includes(key)) {
                return true;
            }
        }

        return false;
    }

    public getProblemsByPath() {
        return this.problemsByPath;
    }

    public clear() {
        this.problemsByPath = {};
    }

    private loadRegexes () {
        for (const type in builtinTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.builtinTypeRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    values: builtinTypes[type]
                });

                delete builtinResourceIds[type];
            }
        }

        for (const type of stringTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.stringTypeRegexes.push(new RegExp(type.slice(1, -1)));

                // stringTypes = stringTypes.filter(fType => fType !== type);
            }
        }

        for (const type of ignoreTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.ignoreTypesRegexes.push(
                    new RegExp(type.slice(1, -1))
                );
            }
        }
    }
}

export const rulesetDefinitionChecker = new RulesetDefinitionChecker();
