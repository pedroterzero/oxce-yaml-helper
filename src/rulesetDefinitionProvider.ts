import { DefinitionProvider, TextDocument, Position, Definition, ProviderResult, workspace, Location, Range, Uri, window } from "vscode";
import { logger } from "./logger";
import { KeyDetector } from "./keyDetector";
import { rulesetTree, RuleType } from "./rulesetTree";
import { Document, parseDocument } from 'yaml';
import { Pair, YAMLMap } from "yaml/types";
import { typedProperties } from "./typedProperties";

interface YAMLDocument {
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

export class RulesetDefinitionProvider implements DefinitionProvider {

    provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition> {
        let value = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document);
        if (!value?.key) {
            return;
        }

        let folder = workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
            return;
        }

        // allows looking for refNodes
        if (value.key.indexOf('*') === 0) {
            return this.findRefNodeInDocument(document.uri, value.key.slice(1));
        }

        // what kind of rule are we trying to look up?
        const ruleType = this.findTypeOfKey(document.uri, value.key, value.range);

        const ruleFiles = rulesetTree.getRuleFiles(value.key, folder, ruleType);
        logger.debug('Found ', ruleFiles?.length, ' matches for ', value.key);

        const files: Uri[] = [];
        ruleFiles?.forEach(ruleFile => {
            logger.debug('Rule file:', ruleFile);
            if (!ruleFile?.file) {
                throw new Error('could not load ' + ruleFile);
            }

            files.push(ruleFile.file);
        })

        return this.findKeyValueLocationInDocuments(files, value.key);
    }

    private findTypeOfKey(file: Uri, key: string, range: Range): RuleType | undefined {
        logger.debug('Looking for requested key ', key, 'in ', file.path);

        const document = window.activeTextEditor?.document;
        if (!document) {
            return;
        }

        const sourceRange = [document.offsetAt(range.start), document.offsetAt(range.end)];
        const rule = this.getKeyInformationFromYAML(document.getText(), key, sourceRange);
        if (!rule) {
            return;
        }

        logger.debug('Key', key, 'is', rule.key, 'of', rule.type);
        return rule;
    }

    async findRefNodeInDocument(file: Uri, key: string): Promise<Location | undefined> {
        logger.debug('Looking for refNode ', key, 'in ', file.path);

        return workspace.openTextDocument(file.path).then((document: TextDocument) => {
            const range = this.findRefNodeRangeInYAML(document.getText(), key);
            if (!range) {
                return;
            }

            return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
        });
    }

    async findKeyValueLocationInDocuments(files: Uri[], absoluteKey: string): Promise<Location[]> {
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

        if (document.getText().indexOf("\r\n") !== -1) {
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

    findKeyValueRangeInYAML(yaml: string, absoluteKey: string): number[] {
        return this.findKeyValueRangeInYamlDocument(this.parseDocument(yaml), absoluteKey);
    }

    findRefNodeRangeInYAML(yaml: string, key: string): number[] {
        const doc = this.parseDocument(yaml);
        const node = doc.anchors.getNode(key);

        if (node) {
            return node.range as number[];
        }

        return [0, 0];
    }

    findKeyValueRangeInYamlDocument(yamlDocument: YAMLDocument, absoluteKey: string): [number, number] {
        logger.debug('findKeyValueRangeInYamlDocument', { absoluteKey });

        const match = this.findKeyValueInYamlDocument(yamlDocument, absoluteKey);
        if (match && match.rule) {
            return match.rule.value.range;
        }

        return [0, 0];
    }

    private getKeyInformationFromYAML(yaml: string, key: string, range: number[]): RuleType | undefined {
        const match = this.findKeyValueInYamlDocument(this.parseDocument(yaml), key, range);

        if (!match) {
            return;
        }

        return {
            type: match.ruleType.key.value,
            key: match.rule.key.value
        };
    }

   findKeyValueInYamlDocument(yamlDocument: YAMLDocument, absoluteKey: string, range?: number[]): RuleMatch | undefined {
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
                            if (this.checkForCorrectRange(range, ruleProperty)) {
                                // highlight the entire block
                                // match = ruleProperties;
                                // highlight just the key
                                match = {
                                    ruleType: ruleType,
                                    rule: ruleProperty
                                };
                            }
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

    private checkForCorrectRange(range: number[] | undefined, ruleProperty: Pair) {
        let matchFound = false;
        if (range) {
            const propRange = ruleProperty.value.range;

            if (range && propRange[0] === range[0] && propRange[1] === range[1]) {
                matchFound = true;
            }
        } else {
            matchFound = true;
        }

        return matchFound;
    }

    private parseDocument (yaml: string): YAMLDocument {
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