import { TextDocument, workspace, Location, Range, Uri, window, EndOfLine } from "vscode";
import { logger } from "./logger";
import { RuleType } from "./rulesetTree";
import { Document, parseDocument } from 'yaml';
import { Pair, YAMLMap } from "yaml/types";
import { typedProperties } from "./typedProperties";
import { rulesetRecursiveKeyRetriever } from "./rulesetRecursiveKeyRetriever";
import { rulesetRefnodeFinder } from "./rulesetRefnodeFinder";

export interface YAMLDocument {
    contents: { items: YAMLDocumentItem[] };
    anchors: {
        getNode: (name: string) => YAMLNode | undefined
    };
}

interface YAMLDocumentItem {
    key: any;
    value: any;
}

interface YAMLNode {
    range?: [number, number] | null
}

interface RuleMatch {
    ruleType: YAMLDocumentItem & YAMLNode;
    rule: YAMLDocumentItem & YAMLNode;
}

export class RulesetParser {
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

    public async findKeyValueLocationInDocuments(files: Uri[], absoluteKey: string): Promise<Location[]> {
        const promises: Thenable<Location | undefined>[] = [];

        files.forEach(file => {
            promises.push(workspace.openTextDocument(file.path).then((document: TextDocument) => {
                const range = this.findKeyValueRangeInYAML(document.getText(), absoluteKey);

                // convert CRLF
                this.fixRangesForWindowsLineEndingsIfNeeded(document, range);

                if (!range) {
                    return;
                }

                return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
            }));
        });

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

    private findKeyValueRangeInYAML(yaml: string, absoluteKey: string): number[] {
        return this.findKeyValueRangeInYamlDocument(this.parseDocument(yaml), absoluteKey);
    }

    private findKeyValueRangeInYamlDocument(yamlDocument: YAMLDocument, absoluteKey: string): [number, number] {
        logger.debug('findKeyValueRangeInYamlDocument', { absoluteKey });

        const match = this.findKeyValueInYamlDocument(yamlDocument, absoluteKey);
        if (match && match.rule) {
            return match.rule.value.range;
        }

        return [0, 0];
    }

    private findKeyValueInYamlDocument(yamlDocument: YAMLDocument, absoluteKey: string): RuleMatch | undefined {
        logger.debug('findKeyValueInYamlDocument', { absoluteKey });

        let yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return;
        }

        // loop through each type in this document
        let match: RuleMatch | undefined;
        yamlPairs.forEach((ruleType) => {
            // console.log('ruleType', ruleType);
            ruleType.value.items.forEach((ruleProperties: YAMLMap) => {
                if (match) {
                    return;
                }

                const propertiesFlat = ruleProperties.toJSON();
                if (typedProperties.isTypePropertyForKey(ruleType.key.value, propertiesFlat, absoluteKey)) {
                    const typeKey = typedProperties.getTypeKey(propertiesFlat, ruleType.key.value);

                    // @todo make this recursive so subitems can be looked up like research.dependencies
                    ruleProperties.items.forEach((ruleProperty: Pair) => {
                        if (ruleProperty.key.value === typeKey) {
                            // highlight the entire block
                            // match = ruleProperties;
                            // highlight just the key
                            match = {
                                ruleType: ruleType,
                                rule: ruleProperty
                            };
                        }
                    });
                }
            });
        })

        if (match) {
            return match;
        }

        return;
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
