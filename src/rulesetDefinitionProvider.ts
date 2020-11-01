import { DefinitionProvider, TextDocument, Position, Definition, ProviderResult, workspace, Location, Range, Uri } from "vscode";
import { logger } from "./logger";
import { KeyDetector } from "./keyDetector";
import { rulesetTree } from "./rulesetTree";
import { Document, parseDocument } from "yaml";
import { Pair, YAMLMap } from "yaml/types";

interface YAMLDocument {
    contents: { items: YAMLDocumentItem[] };
}

interface YAMLDocumentItem {
    stringKey: string;
    value: any;
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

        const ruleFile = rulesetTree.getRuleFile(value.key, folder);

        logger.debug('Rule file:', ruleFile);
        if (!ruleFile?.file) { 
            throw new Error('could not load ' + ruleFile);
        }

        return this.findKeyValueLocationInDocument(ruleFile.file, value.key);
    }

    findKeyValueLocationInDocument(file: Uri, absoluteKey: string): Thenable<Location | null> {
        return workspace.openTextDocument(file.path).then((document: TextDocument) => {
            // return new Location(file, new Range(document.positionAt(0), document.positionAt(0)));

            const range = this.findKeyValueRangeInYAML(document.getText(), absoluteKey);
            if (!range) {
                return null;
            }
            return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
        });
    }

    findKeyValueRangeInYAML(yaml: string, absoluteKey: string): number[] | null {
        let yamlDocument: YAMLDocument = {} as YAMLDocument;
        try {
            // I am not sure why I have to cast this to Document, are yaml package's types broken?
            const doc: Document = parseDocument(yaml);

            yamlDocument.contents = doc.contents;
        } catch (error) {
            logger.error('could not parse yaml document', { error })
            return null;
        }
        return this.findKeyValueRangeInYamlDocument(yamlDocument, absoluteKey);
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

                ruleProperties.items.forEach((ruleProperty: Pair) => {
                    if (ruleProperty.key.value === 'type' && (ruleProperty.value.value === absoluteKey || ruleProperty.value.value.indexOf(absoluteKey + '.') === 0)) {
                        // highlight the entire block
                        // match = ruleProperties; 
                        // highlight just the key
                        match = ruleProperty.value;
                    }
                });

            });
        })

        if (match?.range) {
            return match.range;
        }

        return [0, 0];
    }
}