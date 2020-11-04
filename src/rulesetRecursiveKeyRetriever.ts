import { logger } from "./logger";
import { RuleType } from "./rulesetTree";
import { Pair, Scalar, YAMLMap } from "yaml/types";
import { rulesetParser, YAMLDocument } from "./rulesetParser";

type RecursiveMatch = {
    match: boolean,
    type?: string,
    path?: string,
    node?: Pair | Scalar
}

export class RulesetRecursiveKeyRetriever {
    public getKeyInformationFromYAML(yaml: string, key: string, range: number[]): RuleType | undefined {
        const match = this.findKeyInformationInYamlDocument(rulesetParser.parseDocument(yaml), key, range);

        if (!match || !match.type || !match.path) {
            return;
        }

        return {
            type: match.type,
            key: match.path
        };
    }

    private findKeyInformationInYamlDocument(yamlDocument: YAMLDocument, absoluteKey: string, range?: number[]): RecursiveMatch | undefined {
        logger.debug('findKeyInformationInYamlDocument', { absoluteKey });

        let yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return;
        }

        // loop through each type in this document
        let match: RecursiveMatch | undefined;
        let path: string[] = [];
        yamlPairs.forEach((ruleType) => {
            path.push(ruleType.key.value);

            ruleType.value.items.forEach((ruleProperties: YAMLMap) => {
                const recursiveMatch = this.processItems(ruleProperties, path[0], absoluteKey, range);
                if (recursiveMatch.match) {
                    if (recursiveMatch.path && recursiveMatch.path.indexOf('.') !== -1) {
                        recursiveMatch.type = recursiveMatch.path.slice(0, recursiveMatch.path.indexOf('.'));
                        recursiveMatch.path = recursiveMatch.path.slice(recursiveMatch.path.indexOf('.') + 1);
                    }

                    match = recursiveMatch;
                }
            });
        })

        if (match) {
            return match;
        }

        return;
    }

    private processItems(entry: YAMLMap | string | Scalar, path: string, key: string, range: number[] | undefined): RecursiveMatch {
        let retval: RecursiveMatch = {
            match: false
        };

        if (typeof entry === 'string') {
            if (entry === key) {
                logger.debug('Possible match found', entry);
                return {
                    match: true
                } as RecursiveMatch;
            }
        } else if ('items' in entry) {
            entry.items.forEach((ruleProperty) => {
                const result = this.processItems(ruleProperty.value, path + '.' + ruleProperty?.key?.value, key, range);
                if (result.node) {
                    // node already set, pass it upwards
                    retval = result;
                } else if (result.match && this.checkForRangeMatch(ruleProperty, range)) {
                    logger.debug('Definitive match found by range (string)', key, path, entry);
                    result.node = ruleProperty;
                    result.path = path;

                    retval = result;
                }
            });
        } else {
            entry = entry as Scalar;

            if (entry.value === key && this.checkForRangeMatch(entry, range)) {
                retval.match = true;
                retval.node = entry;
                retval.path = path;

                logger.debug('Definitive match found by range (scalar)', key, retval.path, entry);

                return retval;
            }
        }

        return retval;
    }

    private checkForRangeMatch(entry: Scalar | Pair, range: number[] | undefined): boolean {
        if (entry.range && range) {
            if (entry.range[0] === range[0] && entry.range[1] === range[1]) {
                return true;
            }
        }

        return false;
    }
}

export const rulesetRecursiveKeyRetriever = new RulesetRecursiveKeyRetriever();
