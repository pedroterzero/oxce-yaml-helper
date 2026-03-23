import { get } from 'lodash';
import { Node } from 'yaml2';
import { typedProperties } from './typedProperties';

interface NodeInfo {
    value: any;
    path: string;
    range: [number, number];
    metadata?: any;
}

export class MetadataExtractor {
    getMetadata(
        node: Node | null,
        path: string,
        namesByPath: { [key: string]: string },
    ): { [key: string]: string | number | object } {
        const nodeJson = node?.toJSON();
        const fields = typedProperties.getMetadataFieldsForType(path, nodeJson);
        const metadata: { [key: string]: string | number | object } = {};

        if (node?.comment) {
            metadata._comment = node.comment.trim();
        }

        if (fields && nodeJson) {
            Object.values(fields).forEach((field: string) => {
                const value = get(nodeJson, field);
                if (value !== undefined) {
                    metadata[field] = value;
                }
            });
        }

        if (Object.keys(namesByPath).length > 0) {
            metadata._names = namesByPath;
        }

        return metadata;
    }

    getParentMetadata(
        parentNode: Node | null,
        path: string,
        item: any,
        namesByPath: { [key: string]: string },
    ): { [key: string]: string | number | object } {
        const metadata = this.getMetadata(parentNode, path.split('.').slice(0, -1).join('.'), namesByPath);
        metadata._name = item.value.value;
        return metadata;
    }

    getReferencePathResult(
        key: string,
        range: number[],
        newPath: string,
        item: any,
        parentNode: Node | null,
        namesByPath: { [key: string]: string },
    ): NodeInfo {
        const metadata = this.getParentMetadata(parentNode, newPath, item, namesByPath);

        return {
            value: key,
            path: newPath,
            range: range ? [range[0], range[1]] : [0, 0],
            ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        };
    }
}
