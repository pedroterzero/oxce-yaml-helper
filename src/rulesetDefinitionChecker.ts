import { Diagnostic, DiagnosticSeverity, Range, Uri, workspace } from "vscode";
import { DefinitionLookup, Match } from "./rulesetTree";
import { ReferenceFile, TypeLookup, WorkspaceFolderRuleset } from "./workspaceFolderRuleset";
import { typeLinks } from "./definitions/typeLinks";
import { builtinResourceIds, builtinTypes } from "./definitions/builtinTypes";
import { ignoreTypes } from "./definitions/ignoreTypes";
import { stringTypes } from "./definitions/stringTypes";
import { rulesetResolver } from "./extension";
import { logger } from "./logger";
import { FilesWithDiagnostics, LogicHandler } from "./logic/logicHandler";
import { mergeAndConcat } from "merge-anything";

type Duplicates = {
    [key: string]: DefinitionLookup[];
};

type DuplicateMatches = {
    key: string,
    definition: DefinitionLookup,
    duplicates: DefinitionLookup[]
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

    private ignoreTypeValues: {[key: string]: string[]} = {
        'extraSprites': ['BASEBITS.PCK', 'BIGOBS.PCK', 'FLOOROB.PCK', 'HANDOB.PCK', 'INTICON.PCK', 'Projectiles', 'SMOKE.PCK'],
        'extraSounds': ['BATTLE.CAT'],
    };

    private logicHandler = new LogicHandler;

    public constructor() {
        this.loadRegexes();
    }

    public init(lookup: TypeLookup) {
        this.checkDefinitions(lookup);
        this.logicHandler = new LogicHandler;
    }

    public checkFile(file: ReferenceFile, ruleset: WorkspaceFolderRuleset, workspacePath: string): Diagnostic[] {
        const diagnostics : Diagnostic[] = [];

        this.checkReferences(file, ruleset.definitionsLookup, diagnostics);
        this.addDuplicateDefinitions(file, diagnostics, workspacePath);

        let logicData;
        if ((logicData = ruleset.getLogicData(file.file))) {
            // console.log(`checking! ${file.file.path}`);
            this.logicHandler.check(file.file, diagnostics, logicData);
        }

        return diagnostics;
    }

    public checkRelationLogic(diagnosticsPerFile: FilesWithDiagnostics): FilesWithDiagnostics {
        const additionalFilesWithDiagnostics = this.logicHandler.checkRelationLogic();

        return mergeAndConcat(diagnosticsPerFile, additionalFilesWithDiagnostics) as FilesWithDiagnostics;
    }

    private addDuplicateDefinitions(file: ReferenceFile, diagnostics: Diagnostic[], workspacePath: string) {
        if (!(file.file.path in this.duplicatesPerFile)) {
            return;
        }

        const duplicates = this.duplicatesPerFile[file.file.path];
        // const messages = [];
        for (const duplicate of duplicates) {
            const parts = [];
            for (const dupdef of duplicate.duplicates) {
                parts.push(`${dupdef.file.path.slice(workspacePath.length + 1)} line ${dupdef.rangePosition[0][0]}`);
            }

            const message = `${duplicate.definition.type} ${duplicate.key} is duplicate, also exists in (add # ignoreDuplicate after this to ignore this entry):\n\t${parts.join("\n\t")}`;

            const range = new Range(...duplicate.definition.rangePosition[0], ...duplicate.definition.rangePosition[1]);

            diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Warning));
            // messages.push(message);

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
                    this.addReferenceDiagnostic(ref, diagnostics);
            } else {
                if (this.checkForCorrectTarget(ref, possibleKeys, lookup)) {
                   this.addReferenceDiagnostic(ref, diagnostics);
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
        const possibleKeys = [ref.key];

        if (ref.path === 'armors.spriteInv') {
            possibleKeys.push(ref.key + '.SPK');
        }

        return possibleKeys;
    }

    /**
     * If we found a match, check that the definition found is a valid target for the reference
     * @param ref
     * @param possibleKeys
     * @param lookup
     */
    private checkForCorrectTarget(ref: Match, possibleKeys: string[], lookup: TypeLookup) {
        let add = false;
        if (ref.path in typeLinks) {
            add = this.checkForTypeLinkMatch(typeLinks[ref.path], possibleKeys, lookup);
        } else {
            // regex match (TODO build regexes in advance)
            for (const type in typeLinks) {
                if (type.startsWith('/') && type.endsWith('/')) {
                    const regex = new RegExp(type.slice(1, -1));
                    if (regex.exec(ref.path)) {
                        add = this.checkForTypeLinkMatch(typeLinks[type], possibleKeys, lookup);
                    }
                }
            }
        }

        return add;
    }

    private checkForTypeLinkMatch(typeLinks: string[], possibleKeys: string[], lookup: TypeLookup) {
        if (typeLinks.includes('_dummy_')) {
            // shortcut for dummy (custom logic)
            return false;
        }

        let add = true;
        for (const key of possibleKeys) {
            if (key in lookup) {
                for (const result of lookup[key]) {
                    if (typeLinks.indexOf(result.type) !== -1) {
                        add = false;
                    }
                }
            }
        }
        return add;
    }

    private addReferenceDiagnostic(ref: Match, diagnostics: Diagnostic[]) {
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

        let message = `"${ref.key}" does not exist (${ref.path})`;
        if (ref.metadata && ref.metadata.type) {
            message += ` for ${ref.metadata.type}`;
        }

        diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Warning));
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
        if (ignoreTypes.indexOf(ref.path) !== -1) {
            // ignore these assorted types for now
            return false;
        }
        if (stringTypes.indexOf(ref.path) !== -1) {
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
            }
        }
    }
}

export const rulesetDefinitionChecker = new RulesetDefinitionChecker();
