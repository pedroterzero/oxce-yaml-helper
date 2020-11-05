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
        logger.debug('Looking for requested key ', key, 'in ', window.activeTextEditor?.document.fileName);

        const document = window.activeTextEditor?.document;
        if (!document) {
            return;
        }

        const sourceRange = [document.offsetAt(range.start), document.offsetAt(range.end)];
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
                const range = definition.range;

                // convert CRLF
                this.fixRangesForWindowsLineEndingsIfNeeded(document, range);

                logger.debug(`opening ${definition.file.path} at ${range[0]}:${range[1]}`);
                const myRange = new Range(document.positionAt(range[0]), document.positionAt(range[1]));

                return new Location(definition.file, myRange);
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
    private fixRangesForWindowsLineEndingsIfNeeded(document: TextDocument, range: number[]) {
        if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('attemptCRLFFix')) {
            return;
        }

        if (document.eol === EndOfLine.CRLF) {
            // parse the document so we're working off the same base
            const doc = parseDocument(document.getText(), { maxAliasCount: 1024 });

            // find offset
            const myText = doc.toString().replace("\r\n", "\n");
            // count number of line breaks
            const lineBreaks = myText.slice(0, range[0]).match(/\n/g)?.length || 0;

            // add a byte to the range for each line break
            range[0] += lineBreaks;
            range[1] += lineBreaks;
        }
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
