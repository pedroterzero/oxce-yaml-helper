import { TextDocument, Location, Range, Uri, window, EndOfLine, WorkspaceFolder } from "vscode";
import { logger } from "./logger";
import { Definition, Match, rulesetTree, RuleType, Translation, Variables } from "./rulesetTree";
import { Document, parseDocument } from 'yaml';
import { rulesetRecursiveKeyRetriever } from "./rulesetRecursiveKeyRetriever";
import { rulesetRefnodeFinder } from "./rulesetRefnodeFinder";
import { rulesetDefinitionFinder } from "./rulesetDefinitionFinder";
import { rulesetVariableFinder } from "./rulesetVariableFinder";
import { rulesetTranslationFinder } from "./rulesetTranslationFinder";
import { typedProperties } from "./typedProperties";

export interface ParsedDocument {
    parsed: YAMLDocument,
    regular: Document,
}
export interface YAMLDocument {
    contents: { items: YAMLDocumentItem[] };
    anchors: {
        getNode: (name: string) => YAMLNode | undefined
    };
}

export interface YAMLDocumentItem {
    key: any;
    value: any;
    type: string;
}

export interface YAMLNode {
    range?: [number, number] | null
}

export type JsonObject = {
    [key: string]: string | Record<string, unknown>[];
};

export class RulesetParser {
    public constructor() {
        typedProperties.init();
    }

    public getReferencesRecursively(doc: YAMLDocument): Match[] {
        return rulesetRecursiveKeyRetriever.findAllReferencesInYamlDocument(doc);
    }

    public getDefinitionsFromReferences(references: Match[] | undefined): Definition[] {
        return rulesetDefinitionFinder.getDefinitionsFromReferences(references);
    }

    public getVariables(references: Match[] | undefined): Variables {
        return rulesetVariableFinder.findAllVariablesInYamlDocument(references);
    }

    public getTranslations(doc: any): Translation[] {
        return rulesetTranslationFinder.findAllVariablesInYamlDocument(doc);
    }

    public getTranslationsFromLanguageFile(doc: any): Translation[] {
        return rulesetTranslationFinder.findAllTranslationsInTranslationFile(doc);
    }

    public findTypeOfKey(key: string, range: Range): RuleType | undefined {
        logger.debug(`Looking for requested key ${key} in ${window.activeTextEditor?.document.fileName}`);

        const document = window.activeTextEditor?.document;
        if (!document) {
            return;
        }

        let sourceRange: [number, number] = [document.offsetAt(range.start), document.offsetAt(range.end)];
        // logger.debug(`Searching for type ${key} in ${document.fileName}`);
        sourceRange = this.fixRangesForWindowsLineEndingsIfNeeded(document, sourceRange, true);

        const rule = rulesetRecursiveKeyRetriever.getKeyInformationFromYAML(this.parseDocument(document.getText()).parsed, key, sourceRange);
        if (!rule) {
            return;
        }

        logger.debug(`Key ${key} is ${rule.key} of ${rule.type}`);
        return rule;
    }

    public async findRefNodeInDocument(file: Uri, key: string): Promise<Location | undefined> {
        return rulesetRefnodeFinder.findRefNodeInDocument(file, key);
    }

    public getDefinitionsByName(workspaceFolder: WorkspaceFolder, key: string, ruleType: RuleType | undefined): Location[] {
        if (ruleType && this.isUndefinableNumericProperty(ruleType, key)) {
            return [];
        }

        const definitions = rulesetTree.getDefinitionsByName(key, workspaceFolder, ruleType);
        if (!definitions) {
            return [];
        }

        const locations = [];
        for (const definition of definitions) {
            if (definition.rangePosition) {
                const range = definition.range;
                logger.debug(`opening ${definition.file.path.slice(workspaceFolder.uri.path.length + 1)} at ${range[0]}:${range[1]}`);

                locations.push(
                    new Location(definition.file, new Range(...definition.rangePosition[0], ...definition.rangePosition[1]))
                );
            }
        }

        return locations;
    }

    private isUndefinableNumericProperty(ruleType: RuleType, key: string): boolean {
        if (parseInt(key).toString() !== key) {
            // not an integer
            return false;
        }

        return !typedProperties.isNumericProperty(ruleType.type, ruleType.key);
    }

    public addRangePositions(references: Match[], document: TextDocument) {
        for (const ref of references) {
            ref.range = this.fixRangesForWindowsLineEndingsIfNeeded(document, ref.range);
            ref.rangePosition = [
                [document.positionAt(ref.range[0]).line, document.positionAt(ref.range[0]).character],
                [document.positionAt(ref.range[1]).line, document.positionAt(ref.range[1]).character]
            ];
        }
    }

    /**
     * Checks the line endings, and if it's CRLF, corrects for that. Because the parser uses LF.
     * @param document
     * @param range
     */
    public fixRangesForWindowsLineEndingsIfNeeded(document: TextDocument, range: [number, number], reverse = false): [number, number] {
        const correctRange = {...range};
        // if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('attemptCRLFFix')) {
        //     return correctRange;
        // }

        if (document.eol === EndOfLine.CRLF) {
            // logger.debug(`Range before adjusting for CRLF: ${range[0]}:${range[1]}`);

            // find offset
            let lineBreaks = 0;
            if (reverse) {
                // we're coming from CRLF and want LF position, so subtract them
                lineBreaks = -1 * (document.getText().slice(0, range[0]).match(/\n/g)?.length || 0);
            } else {
                // we're coming from LF and want CRLF position, so account for line breaks
                const myText = document.getText().toString().replace(/\r\n/g, "\n");
                // count number of line breaks
                lineBreaks = myText.slice(0, range[0]).match(/\n/g)?.length || 0;
            }

            // add a byte to the range for each line break
            correctRange[0] += lineBreaks;
            correctRange[1] += lineBreaks;

            // logger.debug(`Range after adjusting for CRLF: ${correctRange[0]}:${correctRange[1]} (reverse: ${reverse})`);
        }

        return correctRange;
    }

    public parseDocument (yaml: string): ParsedDocument {
        const yamlDocument: YAMLDocument = {} as YAMLDocument;
        let doc: Document = new Document();
        try {
            // I am not sure why I have to cast this to Document, are yaml package's types broken?
            doc = parseDocument(yaml, {maxAliasCount: 1024});

            yamlDocument.anchors = doc.anchors;
            yamlDocument.contents = doc.contents;
        } catch (error) {
            logger.error('could not parse yaml document', { error });
        }

        return {
            parsed: yamlDocument,
            regular: doc
        };
    }
}

export const rulesetParser = new RulesetParser();
