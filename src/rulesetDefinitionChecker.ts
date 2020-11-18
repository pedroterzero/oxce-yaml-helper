import { Diagnostic, DiagnosticSeverity, Range, TextDocument, workspace } from "vscode";
import { rulesetParser } from "./rulesetParser";
import { Match } from "./rulesetTree";
import { ReferenceFile, TypeLookup } from "./workspaceFolderRuleset";
import { typeLinks } from "./definitions/typeLinks";
import { builtinResourceIds, builtinTypes } from "./definitions/builtinTypes";
import { ignoreTypes } from "./definitions/ignoreTypes";
import { stringTypes } from "./definitions/stringTypes";

export class RulesetDefinitionChecker {
    private problemsByPath: {[key: string]: number} = {};

    public checkFile(file: ReferenceFile, lookup: TypeLookup): Diagnostic[] {
        const doc = workspace.textDocuments.find(doc => doc.uri.path === file.file.path);
        if (!doc) {
            return [];
        }

        const diagnostics : Diagnostic[] = [];
        for (const ref of file.references) {
            if (!this.typeExists(ref)) {
                continue;
            }

            const possibleKeys = this.getPossibleKeys(ref);
            if (possibleKeys.filter(key => key in lookup).length === 0) {
                this.addDiagnostic(doc, ref, diagnostics);
            } else {
                const add = this.checkForCorrectTarget(ref, possibleKeys, lookup);

                if (add) {
                    this.addDiagnostic(doc, ref, diagnostics);
                }
            }
        }

        return diagnostics;
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

    private addDiagnostic(doc: TextDocument, ref: Match, diagnostics: Diagnostic[]) {
        const myRange = rulesetParser.fixRangesForWindowsLineEndingsIfNeeded(doc, ref.range);
        const range = new Range(doc.positionAt(myRange[0]), doc.positionAt(myRange[1]));

        if (!(ref.path in this.problemsByPath)) {
            this.problemsByPath[ref.path] = 0;
        }

        this.problemsByPath[ref.path]++;

        if (workspace.getConfiguration('oxcYamlHelper').get<string>('validateCategories') === 'no') {
            if (['items.categories', 'manufacture.category'].indexOf(ref.path) !== -1) {
                return;
            }
        }

        // const text = doc.getText(range);
        // if (text.trim().length < text.length) {
        //     // deal with trailing whitespace/CRLF
        //     range = new Range(doc.positionAt(ref.range[0]), doc.positionAt(ref.range[1] - (text.length - text.trim().length)));
        // }
        diagnostics.push(new Diagnostic(range, `"${ref.key}" does not exist (${ref.path})`, DiagnosticSeverity.Warning));
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
