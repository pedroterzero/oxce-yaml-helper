import { DefinitionProvider, TextDocument, Position, Definition, ProviderResult, workspace, Location, Range, Uri } from "vscode";
import { logger } from "./logger";
import { KeyDetector } from "./keyDetector";
import { rulesetTree } from "./rulesetTree";
import { Document, parseDocument } from "yaml";
import { Pair, YAMLMap } from "yaml/types";
import { typedProperties } from "./typedProperties";

interface YAMLDocument {
    contents: { items: YAMLDocumentItem[] };
    anchors: {
        getNode: (name: string) => YAMLNode | undefined
    };
}

interface YAMLDocumentItem {
    stringKey: string;
    key: any;
    value: any;
}

interface YAMLNode {
    range?: [number, number] | null
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

        const ruleFile = rulesetTree.getRuleFile(value.key, folder);

        logger.debug('Rule file:', ruleFile);
        if (!ruleFile?.file) { 
            throw new Error('could not load ' + ruleFile);
        }

        return this.findKeyValueLocationInDocument(ruleFile.file, value.key);
    }

    findRefNodeInDocument(file: Uri, key: string): Thenable<Location | null> {
        logger.debug('Looking for refNode ', key, 'in ', file.path);

        return workspace.openTextDocument(file.path).then((document: TextDocument) => {
            const range = this.findRefNodeRangeInYAML(document.getText(), key);
            if (!range) {
                return null;
            }

            return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
        });
    }

    findKeyValueLocationInDocument(file: Uri, absoluteKey: string): Thenable<Location | null> {
        return workspace.openTextDocument(file.path).then((document: TextDocument) => {
            const range = this.findKeyValueRangeInYAML(document.getText(), absoluteKey);
            if (!range) {
                return null;
            }
            return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
        });
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

        let yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return [0, 0];
        }

        // loop through each type in this document
        let match: Pair | undefined;
        yamlPairs.forEach((ruleType) => {
            // console.log('ruleType', ruleType);
            ruleType.value.items.forEach((ruleProperties: YAMLMap) => {
                if (match) {
                    return;
                }
            
                const propertiesFlat = ruleProperties.toJSON();
                if (typedProperties.isTypePropertyForKey(ruleType.key.value, propertiesFlat, absoluteKey)) {
                    const typeKey = typedProperties.getTypeKey(propertiesFlat, ruleType.key.value);

                    ruleProperties.items.forEach((ruleProperty: Pair) => {
                        if (ruleProperty.key.value === typeKey) {
                            // highlight the entire block
                            // match = ruleProperties; 
                            // highlight just the key
                            match = ruleProperty.value;
                        }
                    });
                }
            });
        })

        if (match?.range) {
            return match.range;
        }

        return [0, 0];
    }

    private parseDocument (yaml: string): YAMLDocument {
        let yamlDocument: YAMLDocument = {} as YAMLDocument;
        try {
            // I am not sure why I have to cast this to Document, are yaml package's types broken?
            const doc: Document = parseDocument(yaml);

            yamlDocument.anchors = doc.anchors;
            yamlDocument.contents = doc.contents;
        } catch (error) {
            logger.error('could not parse yaml document', { error })
        }

        return yamlDocument;
    }
}