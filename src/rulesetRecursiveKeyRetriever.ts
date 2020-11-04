import { logger } from "./logger";
import { RuleType } from "./rulesetTree";
import { Pair, Scalar, YAMLMap } from "yaml/types";
import { rulesetParser, YAMLDocument, YAMLDocumentItem } from "./rulesetParser";

type RecursiveMatch = {
    match: boolean,
    type?: string,
    path?: string,
    node?: Pair | Scalar
}

type Entry = YAMLMap | string | Scalar;

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

    private findKeyInformationInYamlDocument(yamlDocument: YAMLDocument, absoluteKey: string, range: number[]): RecursiveMatch | undefined {
        logger.debug('findKeyInformationInYamlDocument', { absoluteKey });

        let yamlPairs = yamlDocument.contents.items;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return;
        }

        // loop through each entry in this document
        return this.findRecursiveMatch(yamlPairs, absoluteKey, range) || undefined;
    }

    private findRecursiveMatch(yamlPairs: YAMLDocumentItem[], absoluteKey: string, range: number[]) {
        let match: RecursiveMatch | undefined;

        yamlPairs.forEach((ruleType) => {
            ruleType.value.items.forEach((ruleProperties: YAMLMap) => {
                const recursiveMatch = this.processItems(ruleProperties, ruleType.key.value, absoluteKey, range);

                match = this.checkForMatch(recursiveMatch, match);
            });
        });

        return match;
    }

    private checkForMatch(recursiveMatch: RecursiveMatch, matchedObject: RecursiveMatch | undefined) {
        if (recursiveMatch.match) {
            if (recursiveMatch.path && recursiveMatch.path.indexOf('.') !== -1) {
                recursiveMatch.type = recursiveMatch.path.slice(0, recursiveMatch.path.indexOf('.'));
                recursiveMatch.path = recursiveMatch.path.slice(recursiveMatch.path.indexOf('.') + 1);
            }

            matchedObject = recursiveMatch;
        }

        return matchedObject;
    }

    private processItems(entry: Entry, path: string, key: string, range: number[]): RecursiveMatch {
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

    private checkForRangeMatch(entry: Scalar | Pair, range: number[]): boolean {
        if (entry.range) {
            if (entry.range[0] === range[0] && entry.range[1] === range[1]) {
                return true;
            }
        }

        return false;
    }
}

export const rulesetRecursiveKeyRetriever = new RulesetRecursiveKeyRetriever();
