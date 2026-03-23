import { Node, Scalar, isAlias, isMap, isPair, isScalar, isSeq } from 'yaml2';
import { perfTimer } from './performanceTimer';
import { MetadataExtractor } from './metadataExtractor';
import { LogicDataEntry } from './rulesetTree';
import { typedProperties } from './typedProperties';

export interface NodeInfo {
    value: any;
    path: string;
    range: [number, number];
    metadata?: any;
}

export class YamlTraverser {
    constructor(private metadataExtractor: MetadataExtractor) {}

    traverseNode(
        node: Node,
        lookupAll: boolean,
        path: string[] = [],
        namesByPath: { [key: string]: string } = {},
        depth: number = 0,
        isRoot: boolean = true,
        parentNodes: Node[] = [],
        anchors: { [key: string]: Node } = {},
    ): [NodeInfo[], LogicDataEntry[]] {
        const results: NodeInfo[] = [];
        const logicData: LogicDataEntry[] = [];
        const newPath = path
            .filter((item, index) => index !== 1 || item !== '[]')
            .join('.')
            .replaceAll('.[]', '[]');

        const specialPathResult = this.handleSpecialPaths(newPath, results);
        if (specialPathResult !== null) {
            return [specialPathResult, logicData];
        }

        const parentNode = parentNodes[parentNodes.length - 1];

        this.processRefNode(node, anchors);

        logicData.push(...this.checkForAdditionalLogicPath(newPath, node, namesByPath, anchors));

        if (!node) {
            console.error(`Node is null at ${newPath}, position: ${parentNode?.range ?? 'unknown'}`);
        } else if (node.anchor) {
            anchors[node.anchor] = node;
        }

        if (isMap(node)) {
            this.traverseMap(node, lookupAll, path, newPath, namesByPath, depth, isRoot, parentNodes, parentNode, anchors, results, logicData);
        } else if (isSeq(node)) {
            this.traverseSeq(node, lookupAll, path, newPath, namesByPath, depth, parentNodes, anchors, results, logicData);
        } else if (isScalar(node)) {
            results.push(...this.handleScalar(node, isRoot, newPath, lookupAll));
        }

        return [results, logicData];
    }

    private traverseMap(
        node: any,
        lookupAll: boolean,
        path: string[],
        newPath: string,
        namesByPath: { [key: string]: string },
        depth: number,
        isRoot: boolean,
        parentNodes: Node[],
        parentNode: Node,
        anchors: { [key: string]: Node },
        results: NodeInfo[],
        logicData: LogicDataEntry[],
    ) {
        let typeValue = '';
        node.items.forEach((item: any) => {
            const key = item.key.value;

            this.checkForDefinitionName(newPath, item, namesByPath);

            if (item.value?.value && typedProperties.isExtraFilesRule(newPath, key, item.value.value)) {
                typeValue = item.value.value;
            }

            if (typedProperties.isKeyReferencePath(newPath)) {
                results.push(
                    this.metadataExtractor.getReferencePathResult(key, item.key.range, newPath, item, parentNode, namesByPath),
                );
            }

            if (typedProperties.isKeyValueReferencePath(newPath)) {
                results.push(
                    this.metadataExtractor.getReferencePathResult(key, item.key.range, `${newPath}.key`, item, parentNode, namesByPath),
                );
                results.push(
                    this.metadataExtractor.getReferencePathResult(item.value.value, item.value.range, `${newPath}.value`, item, parentNode, namesByPath),
                );
                return;
            }

            const metadata = this.metadataExtractor.getMetadata(node, newPath, namesByPath);
            const newPathForChild = this.buildNewPathForChild(path, key, typeValue, newPath);
            const [childResults, childLogicData] = this.traverseNode(
                item.value,
                lookupAll,
                newPathForChild,
                namesByPath,
                depth,
                isRoot && isScalar(item.value),
                [...parentNodes, node],
                anchors,
            );

            // do not store any results for refNode
            if (path[2] !== 'refNode') {
                results.push(...childResults);
            }
            logicData.push(...childLogicData);

            if (Object.keys(metadata).length > 0 && results.length > 0) {
                results[results.length - 1].metadata = {
                    ...results[results.length - 1].metadata,
                    ...metadata,
                };
            }
        });
    }

    private traverseSeq(
        node: any,
        lookupAll: boolean,
        path: string[],
        newPath: string,
        namesByPath: { [key: string]: string },
        depth: number,
        parentNodes: Node[],
        anchors: { [key: string]: Node },
        results: NodeInfo[],
        logicData: LogicDataEntry[],
    ) {
        node.items.forEach((item: any, index: number) => {
            if (typedProperties.isAdditionalLogicPath(newPath)) {
                namesByPath[`${newPath}[]`] = index.toString();
            }

            const [childResults, childLogicData] = this.traverseNode(
                item,
                lookupAll,
                path.concat('[]'),
                { ...namesByPath },
                depth + 1,
                false,
                [...parentNodes, node],
                anchors,
            );
            results.push(...childResults);
            logicData.push(...childLogicData);
        });
    }

    handleScalar(node: Scalar, isRoot: boolean, newPath: string, lookupAll: boolean): NodeInfo[] {
        const { value } = node;
        const isFloat = typeof value === 'number' && this.isFloat(value);
        const finalPath = isRoot ? `globalVariables.${newPath}` : newPath;
        const isStoreVariable = typedProperties.isStoreVariable(finalPath);
        const isUndefinableNumeric = this.isUndefinableNumericProperty(finalPath, value);
        const isQuotedString = ['QUOTE_DOUBLE', 'QUOTE_SINGLE'].includes(node.type as string);

        const isValidValue =
            (typeof value !== 'boolean' && !isFloat && !isQuotedString && !isUndefinableNumeric) || lookupAll;
        if (isValidValue || isStoreVariable) {
            const range: [number, number] = node.range ? [node.range[0], node.range[1]] : [0, 0];
            const metadata: { [key: string]: string | number } = {};

            if (node.comment) {
                metadata._comment = node.comment.trim();
            }

            return [{
                value,
                path: finalPath,
                range,
                ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
            }];
        }

        return [];
    }

    processRefNode(node: Node, anchors: { [key: string]: Node }): void {
        perfTimer.start('retriever.processRefNode');
        if (isMap(node)) {
            const refNodeItem = node.items.find(
                (item) => isPair(item) && isScalar(item.key) && item.key.value === 'refNode' && isAlias(item.value),
            );

            if (refNodeItem && isAlias(refNodeItem.value)) {
                const anchor = anchors[refNodeItem.value.source];
                if (anchor) {
                    refNodeItem.value = anchor.clone();
                }
            }
        }
        perfTimer.stop('retriever.processRefNode');
    }

    buildNewPathForChild(path: string[], key: string, typeValue: string, newPath: string): string[] {
        if (typeValue && key !== 'type' && newPath !== 'extraSprites.files') {
            return path.concat(typeValue, key);
        }
        return path.concat(key);
    }

    handleSpecialPaths(newPath: string, results: NodeInfo[]): NodeInfo[] | null {
        if (newPath === 'armors.layersDefinition') {
            return results;
        }
        if (newPath === 'extraStrings') {
            results.push({
                value: 'extraStrings',
                path: newPath,
                range: [0, 0],
            });
            return results;
        }
        return null;
    }

    isFloat(n: number): boolean {
        return Number(n) === n && n % 1 !== 0;
    }

    checkForAdditionalLogicPath(
        path: string,
        entry: Node,
        namesByPath: { [key: string]: string },
        anchors: { [key: string]: Node },
    ): LogicDataEntry[] {
        if (typedProperties.isAdditionalLogicPath(path)) {
            let data = entry.toJSON();

            if (isAlias(entry)) {
                const anchor = anchors[entry.source];
                if (anchor) {
                    data = anchor.toJSON();
                }
            }

            return [{
                path,
                data,
                range: entry.range ? [entry.range[0], entry.range[1]] : [0, 0],
                names: namesByPath,
            }];
        }
        return [];
    }

    checkForDefinitionName(path: string, ruleProperty: any, namesByPath: { [key: string]: string }): void {
        for (const key of typedProperties.getPossibleTypeKeys(path)) {
            if (ruleProperty.key?.value === key) {
                namesByPath[path] = ruleProperty.value.value;
            }
        }
    }

    isUndefinableNumericProperty(path: string, value: any): boolean {
        if (parseInt(value) !== value) {
            return false;
        }
        const type = path.split('.', 1)[0];
        const key = path.split('.').slice(1).join('.');
        return !typedProperties.isNumericProperty(type, key);
    }
}
