import { TextDocument, workspace, Location, Range, Uri, window, EndOfLine, WorkspaceFolder } from "vscode";
import { logger } from "./logger";
import { Definition, rulesetTree, RuleType } from "./rulesetTree";
import { Document, parseDocument } from 'yaml';
import { rulesetRecursiveKeyRetriever } from "./rulesetRecursiveKeyRetriever";
import { rulesetRefnodeFinder } from "./rulesetRefnodeFinder";
import { rulesetDefinitionFinder } from "./rulesetDefinitionFinder";

export interface YAMLDocument {
    contents: { items: YAMLDocumentItem[] };
    anchors: {
        getNode: (name: string) => YAMLNode | undefined
    };
}

export interface YAMLDocumentItem {
    key: any;
    value: any;
}

export interface YAMLNode {
    range?: [number, number] | null
}

export class RulesetParser {
    public getDefinitions(yaml: string): Definition[] {
        const doc = this.parseDocument(yaml);

        return rulesetDefinitionFinder.findAllDefinitionsInYamlDocument(doc);
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

        const rule = rulesetRecursiveKeyRetriever.getKeyInformationFromYAML(document.getText(), key, sourceRange);
        if (!rule) {
            return;
        }

        logger.debug('Key', key, 'is', rule.key, 'of', rule.type);
        return rule;
    }

    public async findRefNodeInDocument(file: Uri, key: string): Promise<Location | undefined> {
        return rulesetRefnodeFinder.findRefNodeInDocument(file, key);
    }

    public async getDefinitionsByName(workspaceFolder: WorkspaceFolder, key: string, ruleType: RuleType | undefined): Promise<Location[]> {
        const promises: Thenable<Location | undefined>[] = [];

        const definitions = rulesetTree.getDefinitionsByName(key, workspaceFolder, ruleType);
        if (!definitions) {
            return [];
        }

        for (const definition of definitions) {
            promises.push(workspace.openTextDocument(definition.file.path).then((document: TextDocument) => {
                // take care of CRLF
                const range = this.fixRangesForWindowsLineEndingsIfNeeded(document, definition.range);

                logger.debug(`opening ${definition.file.path} at ${range[0]}:${range[1]}`);

                return new Location(definition.file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
            }));
        }

        const values = await Promise.all(promises);

        const resolvedLocations: Location[] = [];
        values.forEach(resolved => {
            if (resolved) {
                resolvedLocations.push(resolved);
            }
        });

        return resolvedLocations;
    }

    /**
     * Checks the line endings, and if it's CRLF, corrects for that. Because the parser uses LF.
     * @param document
     * @param range
     */
    public fixRangesForWindowsLineEndingsIfNeeded(document: TextDocument, range: [number, number], reverse: boolean = false): [number, number] {
        let correctRange = {...range};
        if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('attemptCRLFFix')) {
            return correctRange;
        }

        if (document.eol === EndOfLine.CRLF) {
            logger.debug(`Range before adjusting for CRLF: ${range[0]}:${range[1]}`)

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

            logger.debug(`Range after adjusting for CRLF: ${correctRange[0]}:${correctRange[1]} (reverse: ${reverse})`)
        }

        return correctRange;
    }

    public parseDocument (yaml: string): YAMLDocument {
        let yamlDocument: YAMLDocument = {} as YAMLDocument;
        try {
            // I am not sure why I have to cast this to Document, are yaml package's types broken?
            const doc: Document = parseDocument(yaml, {maxAliasCount: 1024});

            yamlDocument.anchors = doc.anchors;
            yamlDocument.contents = doc.contents;
        } catch (error) {
            logger.error('could not parse yaml document', { error })
        }

        return yamlDocument;
    }
}

export const rulesetParser = new RulesetParser();
