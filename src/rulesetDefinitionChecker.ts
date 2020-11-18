import { Diagnostic, DiagnosticSeverity, Range, TextDocument, workspace } from "vscode";
import { rulesetParser } from "./rulesetParser";
import { DefinitionLookup, Match } from "./rulesetTree";
import { ReferenceFile, TypeLookup } from "./workspaceFolderRuleset";
import { typeLinks } from "./definitions/typeLinks";
import { builtinResourceIds, builtinTypes } from "./definitions/builtinTypes";
import { ignoreTypes } from "./definitions/ignoreTypes";
import { stringTypes } from "./definitions/stringTypes";
import { rulesetResolver } from "./extension";
import { logger } from "./logger";
import { appendFile } from "fs";

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
        /^extraSprites\.files\.\d+$/
    ];

    private ignoreTypeValues: {[key: string]: string[]} = {
        'extraSprites': ['BASEBITS.PCK', 'BIGOBS.PCK', 'FLOOROB.PCK', 'HANDOB.PCK', 'INTICON.PCK', 'Projectiles', 'SMOKE.PCK'],
        'extraSounds': ['BATTLE.CAT'],
    };

    public init(lookup: TypeLookup) {
        this.checkDefinitions(lookup);
    }


    public checkFile(file: ReferenceFile, lookup: TypeLookup, workspacePath: string): Diagnostic[] {
        const doc = workspace.textDocuments.find(doc => doc.uri.path === file.file.path);
        if (!doc) {
            return [];
        }

        const diagnostics : Diagnostic[] = [];

        this.checkReferences(doc, file, lookup, diagnostics);
        this.addDuplicateDefinitions(doc, diagnostics, workspacePath);

        return diagnostics;
    }

    private addDuplicateDefinitions(doc: TextDocument, diagnostics: Diagnostic[], workspacePath: string) {
        if (!(doc.fileName in this.duplicatesPerFile)) {
            return;
        }

        const duplicates = this.duplicatesPerFile[doc.fileName];
        const messages = [];
        for (const duplicate of duplicates) {
            const parts = [];
            for (const dupdef of duplicate.duplicates) {
                const range = rulesetParser.fixRangesForWindowsLineEndingsIfNeeded(doc, dupdef.range);
                const pos = doc.positionAt(range[0]);

                parts.push(`${dupdef.file.path.slice(workspacePath.length + 1)} line ${pos.line}`);
            }

            const message = `${duplicate.definition.type} ${duplicate.key} is duplicate, also exists in:\n\t${parts.join("\n\t")}`;

            const myRange = rulesetParser.fixRangesForWindowsLineEndingsIfNeeded(doc, duplicate.definition.range);
            const range = new Range(doc.positionAt(myRange[0]), doc.positionAt(myRange[1]));

            diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Warning));
            messages.push(message);

        }

        appendFile(workspacePath + '/messages.txt', doc.fileName.slice(workspacePath.length + 1) + "\n==========\n" + messages.join("\n") + "\n\n", () => { return; });
        // workspace.fs.readFile(Uri.file(workspacePath + '/messages.txt'), new TextEncoder().encode(messages.join("\n")));
//        console.log('foo', duplicates);

                // const parts = [];
        // for (const dupdef of mydefs) {
        //     parts.push(`${dupdef.file.path.slice(workspacePath.length + 1)}:${dupdef.range[0]} ${dupdef.range[1]}`);
        // }

        // const message = `${type} is duplicate, also exists in ${parts.join(', ')}`;
        // console.log(message);
    }

    private checkReferences(doc: TextDocument, file: ReferenceFile, lookup: TypeLookup, diagnostics: Diagnostic[]) {
        for (const ref of file.references) {
            if (!this.typeExists(ref)) {
                continue;
            }

            const possibleKeys = this.getPossibleKeys(ref);
            if (possibleKeys.filter(key => key in lookup).length === 0) {
                this.addDiagnostic(doc, ref, diagnostics, `"${ref.key}" does not exist (${ref.path})`);
            } else {
                const add = this.checkForCorrectTarget(ref, possibleKeys, lookup);

                if (add) {
                    this.addDiagnostic(doc, ref, diagnostics, `"${ref.key}" does not exist (${ref.path})`);
                }
            }
        }
    }

    public checkDefinitions (lookup: TypeLookup) {
        this.duplicatesPerFile = {};

        // disable for now
        return;

        logger.debug(`Existing lookups: ${Object.keys(lookup).length}`);

        // const dupes: {{key: string]: {[key: string]: DefinitionLookup[]} = {};
        const dupes = this.getDuplicatesByKeyAndType(lookup);
        logger.debug(`Number of types that have duplicates: ${Object.keys(dupes).length}`);

        for (const type in dupes) {
            for (const defs of Object.values(dupes[type])) {
                for (const idx1 in defs) {
                    // first loop, build the message for defs that is not this one
                    const def = defs[idx1];

                    const mydefs = [];
                    for (const idx2 in defs) {
                        // inner loop, get defs that aren't this one
                        if (idx1 !== idx2) {
                            mydefs.push(defs[idx2]);
                        }
                        // console.log(type, def.file.path.slice(workspacePath.length + 1), def.range[0], ':', def.range[1]);
                    }

                    if (!(def.file.path in this.duplicatesPerFile)) {
                        this.duplicatesPerFile[def.file.path] = [];
                    }

                    this.duplicatesPerFile[def.file.path].push({
                        key: type,
                        definition: def,
                        duplicates: mydefs,
                    });
                    // const parts = [];
                    // for (const dupdef of mydefs) {
                    //     parts.push(`${dupdef.file.path.slice(workspacePath.length + 1)}:${dupdef.range[0]} ${dupdef.range[1]}`);
                    // }

                    // const message = `${type} is duplicate, also exists in ${parts.join(', ')}`;
                    // console.log(message);
                }
            }
        }
        // console.log('dupQQ', );
        // console.log('dup', dupes);
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

    private getDuplicateKeys (keyDefs: DefinitionLookup[], key: string, hierarchy: { [key: string]: string; }): Duplicates | undefined {
        const duplicates: Duplicates = {};

        for (const def of keyDefs) {
            if (def.type in this.ignoreTypeValues && this.ignoreTypeValues[def.type].indexOf(key) !== -1) {
                return;// keys;
            }
            for (const re of this.ignoreDefinitionRegexes) {
                if (re.exec(def.type)) {
                    return;// keys;
                }
            }

            if (def.file.path.indexOf(hierarchy.mod) !== 0) {
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
                // if (!(type in dupes[key])) {
                //     dupes[key] = {};
                // }
                ret[type] = typeDupes;
                // for (const def of typeDupes) {
                //     // this.diagnosticsPerFile[def.file.path] = {};
                //     console.log(`"${key}" has duplicate(s) (${def.type}) ${def.file.path}:${def.range[0]}`);
                // }
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
            // regex match
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

    private addDiagnostic(doc: TextDocument, ref: Match | DefinitionLookup, diagnostics: Diagnostic[], message: string) {
        const myRange = rulesetParser.fixRangesForWindowsLineEndingsIfNeeded(doc, ref.range);
        const range = new Range(doc.positionAt(myRange[0]), doc.positionAt(myRange[1]));

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

        // const text = doc.getText(range);
        // if (text.trim().length < text.length) {
        //     // deal with trailing whitespace/CRLF
        //     range = new Range(doc.positionAt(ref.range[0]), doc.positionAt(ref.range[1] - (text.length - text.trim().length)));
        // }
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
            // built in types
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

    public getProblemsByPath() {
        return this.problemsByPath;
    }

    public clear() {
        this.problemsByPath = {};
    }
}

export const rulesetDefinitionChecker = new RulesetDefinitionChecker();
