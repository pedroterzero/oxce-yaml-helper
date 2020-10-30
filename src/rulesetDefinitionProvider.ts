import { DefinitionProvider, TextDocument, Position, Definition, ProviderResult, CancellationToken, workspace, Location, Range, Uri } from "vscode";
import { logger } from "./logger";
import { KeyDetector } from "./keyDetector";
import { rulesetResolver } from "./extension";
import { rulesetTree } from "./rulesetTree";
import YAML from "yaml";

interface YAMLDocument {
    contents: { items: YAMLDocumentItem[] };
}

interface YAMLDocumentItem {
    stringKey: string;
    value: any;
}

export class RulesetDefinitionProvider implements DefinitionProvider {

    provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition> {
        let { key } = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document);
        if (!key) {
            return null;
        }
        const ruleFile = rulesetTree.getRuleFile(key, workspace.getWorkspaceFolder(document.uri));

        logger.debug('Rule file:', ruleFile);
        return this.findKeyValueLocationInDocument2(ruleFile.file, key);
    }


    findKeyValueLocationInDocument2(file: Uri, absoluteKey: string): Thenable<Location> {
        return workspace.openTextDocument(file.path).then((document: TextDocument) => {
            // return new Location(file, new Range(document.positionAt(0), document.positionAt(0)));

            const range: number[] = this.findKeyValueRangeInYAML2(document.getText(), absoluteKey);
            if (!range) {
                return null;
            }
            return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
        });
    }

    findKeyValueRangeInYAML2(yaml: string, absoluteKey: string): number[] {
        let yamlDocument: YAMLDocument = null;
        try {
            yamlDocument = YAML.parseDocument(yaml);
        } catch (error) {
            logger.error('could not parse yaml document', { error })
            return null;
        }
        return this.findKeyValueRangeInYamlDocument2(yamlDocument, absoluteKey);
    }

    findKeyValueRangeInYamlDocument2(yamlDocument: YAMLDocument, absoluteKey: string): number[] {
        logger.debug('findKeyValueRangeInYamlDocument', { absoluteKey });

        const keyParts: string[] = absoluteKey.split('.').filter(key => key.length > 0);

        let yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return null;
        }

        // loop through each type in this document
        let match;
        yamlPairs.forEach((ruleType) => {
            // console.log('ruleType', ruleType);
            ruleType.value.items.forEach(ruleProperties => {
                if (match) {
                    return;
                }

                ruleProperties.items.forEach(ruleProperty => {
                    if (ruleProperty.key.value === 'type' && (ruleProperty.value.value === absoluteKey || ruleProperty.value.value.indexOf(absoluteKey + '.') === 0)) {
                        // highlight the entire block
                        // match = ruleProperties; 
                        // highlight just the key
                        match = ruleProperty.value;
                    }
                });

            });
        })

        if (match) {
            return match.range;
        }
    }
}