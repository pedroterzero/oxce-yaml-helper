import { logger } from "./logger";
import { Pair, YAMLMap } from "yaml/types";
import { typedProperties } from "./typedProperties";
import { rulesetParser, YAMLDocument, YAMLDocumentItem, YAMLNode } from "./rulesetParser";

interface RuleMatch {
    ruleType: YAMLDocumentItem & YAMLNode;
    rule: YAMLDocumentItem & YAMLNode;
}

export class RulesetKeyValueFinder {
    public findKeyValueRangeInYAML(yaml: string, absoluteKey: string): number[] {
        return this.findKeyValueRangeInYamlDocument(rulesetParser.parseDocument(yaml), absoluteKey);
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
}

export const rulesetKeyValueFinder = new RulesetKeyValueFinder();
