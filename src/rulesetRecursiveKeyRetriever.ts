import { Node, isMap, isScalar, isSeq } from "yaml2";
import { YAMLDocument } from "./rulesetParser";
import { LogicDataEntry, Match, RuleType } from "./rulesetTree";
import { typedProperties } from "./typedProperties";
import { get } from "lodash";

interface NodeInfo {
    value: any;
    path: string;
    range: [number, number];
    metadata?: any;
  }

export class RulesetRecursiveKeyRetriever {
    // private logicHandler = new LogicHandler();

    public getKeyInformationFromYAML(doc: YAMLDocument, key: string, range: number[]): RuleType | undefined {
        const [references] = this.findAllReferencesInYamlDocument(doc, true);

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

    public findAllReferencesInYamlDocument(doc: YAMLDocument, lookupAll = false): [Match[], LogicDataEntry[]] {
        const ret = this.findKeyInformationInYamlDocument(doc, lookupAll);
        // console.log(JSON.stringify(ret, null, 2));
        return ret;
        // return this.findKeyInformationInYamlDocument(doc, lookupAll);
    }

    private findKeyInformationInYamlDocument(yamlDocument: YAMLDocument, lookupAll: boolean): [Match[], LogicDataEntry[]] {
        // const matches: Match[] = [];
        const logicData: LogicDataEntry[] = [];

        if (lookupAll) {
            console.log(lookupAll);
        }
        // console.log(yamlDocument.contents);

       const nodes = this.traverseNode(yamlDocument.contents!);

        // console.log(nodes.length, JSON.stringify(nodes, null, 2));
        const matches: Match[] = nodes.map((node) => {
            const match: Match = {
                key: node.value,
                path: node.path,
                range: node.range,
                ...node.metadata ? {metadata: node.metadata} : {}
            };

            return match;
        });

        return [
            matches,
            logicData
        ];
    }

    private traverseNode(node: Node, path: string[] = [], depth: number = 0, isRoot: boolean = true, parentNode: Node | null = null): NodeInfo[] {
        const results: NodeInfo[] = [];
        const newPath = path.filter((item, index) => index !== 1 || item !== '[]').join('.').replaceAll('.[]', '[]');

        if (isMap(node)) {
            const isKeyReferencePath = typedProperties.isKeyReferencePath(newPath);
            let typeValue = '';
            node.items.forEach((item: any) => {
                const key = item.key.value;

                // Handle extraSprites
                if (typedProperties.isExtraFilesRule(newPath, key, item.value.value)) {
                    typeValue = item.value.value;
                }

                if (isKeyReferencePath) {
                    const metadata = this.getParentMetadata(parentNode, newPath, item);

                    results.push({
                        value: key,
                        path: newPath,
                        range: item.key.range ? [item.key.range[0], item.key.range[1]] : [0, 0],
                        ...Object.keys(metadata).length > 0 ? {metadata} : {},
                    });

                    return;
                }

                const newPathForChild = this.buildNewPathForChild(path, key, typeValue, newPath);
                results.push(...this.traverseNode(item.value, newPathForChild, depth, isRoot && isScalar(item.value), node));
            });
        } else if (isSeq(node)) {
            node.items.forEach((item: any, _index: number) => {
                results.push(...this.traverseNode(item, path.concat('[]'), depth + 1, false, node));
            });
        } else if (isScalar(node)) {
            const isFloat = (typeof node.value === 'number' && this.isFloat(node.value));

            if (typeof node.value !== 'boolean' && !isFloat && !this.isUndefinableNumericProperty(newPath, node.value)) {
                const finalPath = isRoot ? 'globalVariables.' + newPath : newPath;
                results.push({
                    value: node.value,
                    path: finalPath,
                    range: node.range ? [node.range[0], node.range[1]] : [0, 0],
                });
            }
        }

        return results;
    }

    private buildNewPathForChild(path: string[], key: string, typeValue: string, newPath: string) {
        if (typeValue && key !== 'type' && newPath !== 'extraSprites.files') {
            return path.concat(typeValue, key);
        }
        return path.concat(key);
    }

    private getMetadata(node: Node | null, path: string): {[key: string]: string | number} {
        const nodeJson = node?.toJSON();
        const fields = typedProperties.getMetadataFieldsForType(path, nodeJson);
        const metadata: {[key: string]: string | number} = {};
        if (fields && nodeJson) {
            Object.values(fields).forEach((field: string) => {
                const value = get(nodeJson, field); // Use lodash's get function to access nested properties
                if (value !== undefined) {
                    metadata[field] = value;
                }
            });
        }

        return metadata;
    }

    private getParentMetadata(parentNode: Node | null, path: string, item: any): {[key: string]: string | number} {
        const metadata = this.getMetadata(parentNode, path.split('.').slice(0, -1).join('.'));

        // Add _name manually
        metadata._name = item.value.value;

        return metadata;
    }

    private isFloat(n: number): boolean {
        return Number(n) === n && n % 1 !== 0;
    }

/*    private findKeyInformationInYamlDocument(yamlDocument: YAMLDocument, lookupAll: boolean): [Match[], LogicDataEntry[]] {
        // logger.debug('findKeyInformationInYamlDocument');

        const yamlPairs = yamlDocument.contents && 'items' in yamlDocument.contents ? yamlDocument.contents.items : null;
        if (!yamlPairs) {
            logger.warn('yamlDocument does not have any items');
            return [[], []];
        }

        // loop through each entry in this document
        return this.findRecursiveMatch(yamlPairs, lookupAll) || undefined;
    }

    private findRecursiveMatch(yamlPairs: YAMLDocumentItem[], lookupAll: boolean): [Match[], LogicDataEntry[]] {
        const matches: Match[] = [];
        const logicData: LogicDataEntry[] = [];
        yamlPairs.forEach((ruleType) => {
            if (ruleType.value.type === 'PLAIN') {
                // globalVariables does this
                this.processItems(ruleType, 'globalVariables', matches, logicData, {}, {}, lookupAll);
            } else {
                ruleType.value.items.forEach((ruleProperties: YAMLSeq) => {
                    let path = ruleType.key.value;
                    if (typedProperties.isGlobalVariablePath(path)) {
                        path = `globalVariables.${path}`;
                    }

                    this.processItems(ruleProperties, path, matches, logicData, {}, {}, lookupAll);
                });
            }
        });

        return [matches, logicData];
    }

    private processItems(entry: Entry, path: string, matches: Match[], logicData: LogicDataEntry[], namesByPath: {[key: string]: string}, metadataByPath: {[key: string]: Record<string, unknown>}, lookupAll: boolean, parent?: YAMLSeq): Match | undefined {
        this.checkForAdditionalLogicPath(path, logicData, entry, namesByPath);

        let keyReferencePath;
        if ((keyReferencePath = typedProperties.isKeyReferencePath(path)) !== undefined) {
            // do this separately, because the values for the keys could yield yet more references (see research.getOneFreeProtected)
            this.processKeyReferencePath(entry, path, matches, parent);

            if ('recurse' in keyReferencePath && keyReferencePath.recurse === false) {
                // console.log(`not recursing ${path}`);
                return;
            }
        }

        if (entry === null) {
            // this should actually not happen, but happens if there are parse errors in yaml (like missing values)
            logger.error(`found a null value at ${path} -- ignoring`);
        // } else if (typedProperties.isKeyReferencePath(path)) {
        //     this.processKeyReferencePath(entry, path, matches);
        } else if (typedProperties.isKeyValueReferencePath(path)) {
            this.processKeyValueReferencePath(entry, path, matches);
        } else if (typeof entry === 'string' || typeof entry === 'number') {
            return;
        } else if (entry.type === 'PAIR') {
            // i.e. startingbase
            // console.log('looping PAIR', path + '.' + entry.key.value);
            const ret = this.processItems(entry.value, path + '.' + entry.key.value, matches, logicData, namesByPath, metadataByPath, lookupAll);
            if (ret) {
                matches.push(ret);
            }
        } else if ('items' in entry) {
            if (entry.items.length > 0) {
                this.loopEntry(entry, path, matches, logicData, namesByPath, metadataByPath, lookupAll);
            }
        } else {
            entry = entry as Scalar;
            const value = entry.value;
            //  tags: ~ (null), ignore it, null is also an object
            const range = (typeof value === 'object' && value !== null && 'range' in value) ? value.range : entry.range;
            if ('type' in entry && ['QUOTE_DOUBLE', 'QUOTE_SINGLE', 'ALIAS'].indexOf(entry.type as string) !== -1) {
                // ignore regular strings, also ALIAS for now?
                return;
            }

            if (this.isBoolean(value, path) || this.isFloat(value) || (!lookupAll && this.isUndefinableNumericProperty(path, value))) {
                // ignore floats/bools/ints-that-are-not-a-property, they are never a reference
                return;
            }

            const ret: Match = {
                key: value,
                path,
                range,
            };

            if (entry.comment) {
                ret.metadata = {_comment: entry.comment.trim()};
            }

            this.addNamesForRelatedLogicChecks(ret, namesByPath);

            return ret;
        }

        return;
    }

    /**
     * If there's any metadata from a parent path, add it in. This is used for the logic checks. It's not really possible to do it specifically
     * for every property, such as mapScripts.commands[].groups, because it can also be mapScripts.commands[].groups[] which is handled differently
     * @param match
     * @param metadataByPath
     *//*
    private addMetadataForLogicChecks(match: Match, metadataByPath: {[key: string]: Record<string, unknown>}) {
        if (this.logicHandler.isRelatedLogicField(match.path)) {
            for (const metadata of Object.values(metadataByPath)) {
                match.metadata = {...match.metadata || {}, ...metadata};
            }
        }
    }

    private addNamesForRelatedLogicChecks(match: Match, namesByPath: { [key: string]: string; }) {
        if (this.logicHandler.isRelatedLogicField(match.path)) {
            if (!('metadata' in match) || typeof match.metadata !== 'object') {
                match.metadata = {};
            }

            match.metadata._names = namesByPath;
        }
    }

    private processKeyReferencePath(entry: Entry, path: string, matches: Match[], parent: YAMLSeq | undefined) {
        if (typeof entry !== 'object' || !('items' in entry)) {
            return;
        }

        const map = entry as YAMLMap;

        for (const item of map.items) {
            // @TODO check if we can just use _names and revert
            const match: Match = {
                key: item.key.value,
                path,
                range: item.key.range,
            };

            let metadata: typeof match.metadata = {};
            if (parent) {
                // get any metadata from parent
                metadata = this.addMetadata(path.split('.').slice(0, -1).join('.'), parent) || {};
            }

            if (item.value?.type === 'PLAIN') {
                metadata._name = item.value.value;
            }

            if (item.value?.comment) {
                metadata._comment = item.value.comment.trim();
            }

            if (Object.keys(metadata).length > 0) {
                match.metadata = metadata;
            }

            matches.push(match);
        }
    }

    private processKeyValueReferencePath(entry: Entry, path: string, matches: Match[]) {
        if (typeof entry !== 'object' || !('items' in entry)) {
            return;
        }

        const map = entry as YAMLMap;

        for (const item of map.items) {
            matches.push({
                key: item.key.value,
                path: path + '.key',
                range: item.key.range,
            });

            matches.push({
                key: item.value.value,
                path: path + '.value',
                range: item.value.range,
            });
        }
    }

    private loopEntry(entry: YAMLSeq, path: string, matches: Match[], logicData: LogicDataEntry[], namesByPath: {[key: string]: string}, metadataByPath: {[key: string]: Record<string, unknown>}, lookupAll: boolean) {
        this.checkForAdditionalLogicPath(path, logicData, entry, namesByPath);

        let index = -1;
        entry.items.forEach((ruleProperty) => {
            index++;

            if ('items' in ruleProperty) {
                let newNamesByPath = {} as typeof namesByPath;
                if (Object.keys(namesByPath).length > 0) {

                    // store the index so we can refer to it later (mostly for logic checks)
                    newNamesByPath = Object.assign({}, namesByPath);
                    newNamesByPath[`${path}[]`] = index.toString();
                }
                // console.log(`looping ${ruleProperty} path ${path}[]`);
                if (typedProperties.isKeyReferencePath(path + '[]') !== undefined) {
                    // this is quite unfortunate, but needed for things like manufacture.randomProducedItems[][]
                    this.processItems(ruleProperty, path + '[]', matches, logicData, newNamesByPath, metadataByPath, lookupAll);
                } else {
                    this.loopEntry(ruleProperty, path + '[]', matches, logicData, newNamesByPath, metadataByPath, lookupAll);
                }
            } else {
                if (['ALIAS'].includes(ruleProperty.type)) {
                    // ignore ALIAS (refNode)
                    return;
                }

                this.checkForDefinitionName(path, ruleProperty, namesByPath);

                let newPath = path;
                if (['PLAIN', 'QUOTE_DOUBLE', 'QUOTE_SINGLE'].indexOf(ruleProperty.type) !== -1) {
                    newPath += '[]';
                } else {
                    if (typedProperties.isExtraFilesRule(path, ruleProperty?.key?.value, entry.items[0].value.value)) {
                        // TODO figure out it shouldn't already be working like this? or refactor the rest to work like this?
                        // logger.debug(`isExtraFilesRule ${path} ${ruleProperty?.key?.value} ${entry.items[0].value.value}`);
                        newPath += '.' + entry.items[0].value.value;
                    }

                    newPath += '.' + ruleProperty?.key?.value;
                }

                const result = this.processItems(ruleProperty.value, newPath, matches, logicData, namesByPath, metadataByPath, lookupAll, entry);

                const metadata = this.addMetadata(path, entry);
                if (metadata) {
                    metadataByPath[path] = metadata;
                }

                if (result) {
                    const metadata = this.addMetadata(path, entry);
                    if (metadata) {
                        result.metadata = Object.assign(metadata, result.metadata ?? {});
                    }
                    matches.push(result);
                } else {
                    const parsed = this.getRulePropertyType(ruleProperty, path, lookupAll);
                    if (parsed.stop) {
                        return;
                    }
                    if (parsed.loop) {
                        // already done by processitems above?
                        // this.loopEntry(parsed.value, newPath, matches, lookupAll);
                        return;
                    }
                    const match: Match = {
                        key: parsed.value,
                        path,
                        range: parsed.range,
                    };

                    const metadata = this.addMetadata(path, entry);
                    if (metadata) {
                        match.metadata = metadata;
                    }

                    this.addNamesForRelatedLogicChecks(match, namesByPath);
                    this.addMetadataForLogicChecks(match, metadataByPath);

                    // console.log(`range1 ${range[0]}:${range[1]}`);
                    matches.push(match);
                }
            }
        });
    }

    private checkForAdditionalLogicPath(path: string, logicData: LogicDataEntry[], entry: Entry, namesByPath: {[key: string]: string}) {
        if (typedProperties.isAdditionalLogicPath(path)) {
            if (typeof entry !== 'object' || !('toJSON' in entry) || !('range' in entry)) {
                return;
            }

            logicData.push({
                path,
                data: entry.toJSON(),
                range: entry.range || [0, 0],
                names: namesByPath
            });
        }
    }

    /**
     * Check if this path contains a definition and stores it
     * @param path
     * @param ruleProperty
     * @param namesByPath
     *//*
    private checkForDefinitionName(path: string, ruleProperty: any, namesByPath: { [key: string]: string; }) {
        for (const key of typedProperties.getPossibleTypeKeys(path)) {
            if (ruleProperty.key?.value === key) {
                namesByPath[path] = ruleProperty.value.value;
            }
        }
    }

    private getRulePropertyType(ruleProperty: any, path: string, lookupAll: boolean) {
        let value = ruleProperty.value;
        let range = ruleProperty.range;

        const ignoreTypes = ['QUOTE_DOUBLE', 'QUOTE_SINGLE', 'ALIAS'];

        if (!value || ignoreTypes.indexOf(ruleProperty.type) !== -1) {
            // empty value (happens with empty string for example) or type that we ignore
            return {stop: true};
        }

        if (typeof value === 'object' && 'type' in value && ignoreTypes.indexOf(value.type) !== -1) {
            // ignore aliases for now(?)
            return {stop: true};
        }
        if (['MAP', 'FLOW_SEQ', 'SEQ', 'FLOW_MAP'].indexOf(value.type) !== -1) {
            return {value, loop: true};
            // this.loopEntry(value, newPath, matches, lookupAll);
            // return;
        }

        if (['PAIR', 'SCALAR',].indexOf(ruleProperty.type) !== -1) { // i.e. Scalar
            value = ruleProperty.value.value;
            range = ruleProperty.value.range;
        }

        if (ruleProperty.type === 'PLAIN' && value.toString().length !== range[1] - range[0]) {
            // fix trailing whitespace, apparently the library does not properly handle this -- at least I hope that's what it is
            // logger.debug(`Fixing range for ${path} from ${range[0]}-${range[1]} to ${range[0]}-${range[0] + value.toString().length}`);
            range[1] = range[0] + value.toString().length;
        }

        if (typeof value === 'boolean' || this.isFloat(value) || (!lookupAll && this.isUndefinableNumericProperty(path, value))) {
            // ignore floats/bools/ints-that-are-not-a-property, they are never a reference
            return {stop: true};
        }

        return {
            value,
            range
        };
    }

    private isFloat(value: any) {
        return parseFloat(value) === value && parseInt(value) !== value;
    }

    private isBoolean(value: any, path: string) {
        return typeof value === 'boolean' && !typedProperties.isStoreVariable(path);
    }*/

    private isUndefinableNumericProperty(path: string, value: any): boolean {
        if (parseInt(value) !== value) {
            // not an integer
            return false;
        }

        const type = path.split('.', 1)[0];
        const key = path.split('.').slice(1).join('.');
        return !typedProperties.isNumericProperty(type, key);
    }

/*    private addMetadata(path: string, entry: YAMLSeq): Record<string, unknown> | undefined {
        // TODO we seem to come here too many times, check with one item (properties.type === 'STR_12GAUGE_NON_LETHAL_X8')
        const fields = typedProperties.getMetadataFieldsForType(path, entry.toJSON());
        if (!fields) {
            return;
        }

        const properties = entry.toJSON() as {[key: string]: any};
        const metadata: Record<string, unknown> = {};
        for (const fieldKey in fields) {
            const fieldName = fields[fieldKey];
            if (properties && has(properties, fieldName)) {
                metadata[fieldKey] = get(properties, fieldName);
            }
        }

        return metadata;
    }*/

    private checkForRangeMatch(range1: number[], range2: number[]): boolean {
        return range1[0] === range2[0] && range1[1] === range2[1];
    }
}

export const rulesetRecursiveKeyRetriever = new RulesetRecursiveKeyRetriever();
