import { logger } from "./logger";
import { YAMLMap } from "yaml/types";
import { typedProperties } from "./typedProperties";
import { YAMLDocument } from "./rulesetParser";
import { Definition } from "./rulesetTree";

export class RulesetDefinitionFinder {
    public findAllDefinitionsInYamlDocument(yamlDocument: YAMLDocument): Definition[] {
        logger.debug('findAllDefinitionsInYamlDocument');

        let yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return [];
        }

        const definitions: Definition[] = [];

        // loop through each type in this document
        yamlPairs.forEach((ruleType) => {
            // console.log('ruleType', ruleType.key.value);
            ruleType.value.items?.forEach((ruleProperties: YAMLMap) => {
                // console.log('ruleprop', ruleProperties);

                const propertiesFlat = ruleProperties.toJSON() as {[key: string]: string | object};
                const typeKey = typedProperties.getTypeKey(propertiesFlat, ruleType.key.value);
                if (typeKey && typeKey in propertiesFlat) {
                    // now get the range
                    for (let ruleProperty of ruleProperties.items) {
                        if (ruleProperty.key.value === typeKey) {
                            definitions.push({
                                type: ruleType.key.value,
                                // field: typeKey,
                                name: propertiesFlat[typeKey] as string,
                                range: ruleProperty.value.range,
                            });

                            break;
                        }
                    }
                }
            });
        })

        return definitions;
    }
}

export const rulesetDefinitionFinder = new RulesetDefinitionFinder();
