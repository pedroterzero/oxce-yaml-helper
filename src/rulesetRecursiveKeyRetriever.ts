import { logger } from "./logger";
import { Match, RuleType } from "./rulesetTree";
import { Scalar, YAMLMap, YAMLSeq } from "yaml/types";
import { JsonObject, YAMLDocument, YAMLDocumentItem } from "./rulesetParser";
import { typedProperties } from "./typedProperties";

type Entry = YAMLSeq | YAMLDocumentItem | string | Scalar;

export class RulesetRecursiveKeyRetriever {
    public getKeyInformationFromYAML(doc: YAMLDocument, key: string, range: number[]): RuleType | undefined {
        const references = this.findAllReferencesInYamlDocument(doc, true);

        for (const ref of references) {
            // if (ref.key === key) {
            //     console.log(`key ${key}, docrange ${range[0]}:${range[1]}, refrange ${ref.range[0]}:${ref.range[1]}`);
            // }
            if ((ref.key === key || ref.key.toString() === key) && this.checkForRangeMatch(range, ref.range)) {
                const ruleMatch: RuleType = {
                    type: ref.path.split('.').slice(0, -1).join('.'),
                    key: ref.path.split('.').slice(-1).join('.')
                };

                if (ref.metadata) {
                    ruleMatch.metadata = ref.metadata;
                }

                return ruleMatch;
            }
        }

        return;
    }

    public findAllReferencesInYamlDocument(doc: YAMLDocument, lookupAll = false): Match[] {
        return this.findKeyInformationInYamlDocument(doc, lookupAll);
    }

    private findKeyInformationInYamlDocument(yamlDocument: YAMLDocument, lookupAll: boolean): Match[] {
        logger.debug('findKeyInformationInYamlDocument');

        const yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return [];
        }

        // loop through each entry in this document
        return this.findRecursiveMatch(yamlPairs, lookupAll) || undefined;
    }

    private findRecursiveMatch(yamlPairs: YAMLDocumentItem[], lookupAll: boolean): Match[] {
        const matches: any = [];
        yamlPairs.forEach((ruleType) => {
            if (ruleType.value.type === 'PLAIN') {
                // globalVariables does this
                this.processItems(ruleType, ruleType.key.value, matches, lookupAll);
            } else {
                ruleType.value.items.forEach((ruleProperties: YAMLSeq) => {
                    if (['extraSprites', 'extraSounds'].indexOf(ruleType.key.value) !== -1) {
                        // I hate that I need this but I see no other way
                        // const propertiesFlat = ruleProperties.toJSON() as {[key: string]: string | Record<string, unknown>};
                        const propertiesFlat = (ruleProperties as YAMLMap).toJSON() as JsonObject;
                        this.handleExtraFiles(propertiesFlat, ruleProperties, matches, ruleType);
                    } else {
                        this.processItems(ruleProperties, ruleType.key.value, matches, lookupAll);
                    }
                });
            }
        });

        return matches;
    }

    private processItems(entry: Entry, path: string, matches: Match[], lookupAll: boolean): Match | undefined {
        if (entry === null) {
            // this should actually not happen, but happens if there are parse errors in yaml (like missing values)
            logger.error(`found a null value at ${path} -- ignoring`);
        } else if (typeof entry === 'string' || typeof entry === 'number') {
            return;
        } else if ('items' in entry) {
            this.loopEntry(entry, path, matches, lookupAll);
        } else {
            entry = entry as Scalar;
            const value = entry.value;

            if (typeof value === 'boolean' || this.isFloat(value) || (!lookupAll && this.isUndefinableNumericProperty(path, value))) {
                // ignore floats/bools/ints-that-are-not-a-property, they are never a reference
                return;
            }

            return {
                key: value,
                path,
                range: entry.range || [0, 0],
            };
        }

        return;
    }

    private loopEntry(entry: YAMLSeq, path: string, matches: Match[], lookupAll: boolean) {
        entry.items.forEach((ruleProperty) => {
            if ('items' in ruleProperty) {
                // console.log(`looping ${ruleProperty} path ${path}[]`);
                this.loopEntry(ruleProperty, path + '[]', matches, lookupAll);
            } else {
                let newPath = path;
                if (['PLAIN', 'QUOTE_DOUBLE', 'QUOTE_SINGLE'].indexOf(ruleProperty.type) !== -1) {
                    newPath += '[]';
                } else {
                    newPath += '.' + ruleProperty?.key?.value;
                }

                const result = this.processItems(ruleProperty.value, newPath, matches, lookupAll);
                if (result) {
                    result.metadata = this.addMetadata(path, entry);
                    matches.push(result);
                } else {
                    // logger.debug('Definitive match found by range (string)'/*, key*/, path, entry);

                    let value = ruleProperty.value;
                    if (ruleProperty.type === 'SCALAR') { // i.e. Scalar
                        value = value.value;
                    }

                    if (typeof value === 'boolean' || this.isFloat(value) || (!lookupAll && this.isUndefinableNumericProperty(path, value))) {
                        // ignore floats/bools/ints-that-are-not-a-property, they are never a reference
                        return;
                    }

                    const metadata = this.addMetadata(path, entry);

                    matches.push({
                        key: value,
                        path,
                        range: ruleProperty.value.range || [0, 0],
                        metadata
                    });
                }
            }
        });
    }

    private isFloat(value: any) {
        return parseFloat(value) === value && parseInt(value) !== value;
    }

    private isUndefinableNumericProperty(path: string, value: any): boolean {
        if (parseInt(value) !== value) {
            // not an integer
            return false;
        }

        const [type, key] = path.split('.', 2);
        return !typedProperties.isNumericProperty(type, key);
    }

    private addMetadata(path: string, entry: YAMLSeq): Record<string, unknown> | undefined {
        const fields = typedProperties.getMetadataFieldsForType(path);
        if (!fields) {
            return;
        }

        const properties = entry.toJSON() as {[key: string]: any};
        const metadata: Record<string, unknown> = {};
        for (const field of fields) {
            if (properties && field in properties) {
                metadata[field] = properties[field];
            }
        }

        return metadata;
    }

    private checkForRangeMatch(range1: number[], range2: number[]): boolean {
        return range1[0] === range2[0] && range1[1] === range2[1];
    }

        /**
     * Parses extraSprites and extraSounds
     * @param propertiesFlat
     * @param ruleProperties
     * @param definitions
     * @param ruleType
     */
    private handleExtraFiles(propertiesFlat: JsonObject, ruleProperties: YAMLSeq, matches: Match[], ruleType: YAMLDocumentItem) {
        const typeKey = 'files';
        if (!(typeKey in propertiesFlat)) {
            return;
        }

        for (const ruleProperty of ruleProperties.items) {
            if (ruleProperty.key.value === typeKey) {
                for (const entry of ruleProperty.value.items) {
                    matches.push({
                        key: entry.key.value,
                        path: ruleType.key.value + '.' + propertiesFlat.type + '.' + typeKey,
                        range: entry.key.range,
                    });
                }
            }
        }
    }
}

export const rulesetRecursiveKeyRetriever = new RulesetRecursiveKeyRetriever();
