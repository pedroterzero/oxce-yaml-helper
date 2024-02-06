import { Position, Range, TextDocument } from 'vscode';
import { logger } from './logger';
import { parseDocument } from 'yaml2';

export type KeyMatch = {
    key: string;
    range: Range;
    type?: string;
};

/**
 * Provides functions to detect and transform keys
 */
export class KeyDetector {
    /**
     * check if key is valid
     * @param key key to validate
     */
    public static isValidKey(key: string): boolean {
        return typeof key === 'string';
    }

    /**
     * find a key at position and return its range
     * @param position position to look for the key
     * @param document current document
     */
    public static getRangeOfKeyAtPosition(
        position: Position,
        document: TextDocument,
        includeSemicolon: boolean,
    ): Range | undefined {
        // const stringRegex = /\*[A-Za-z0-9_]+|(\*?[A-Z0-9_]+(\.(PCK|SPK|SCR))?)/g;
        let stringRegex;
        if (includeSemicolon) {
            stringRegex = /\*?[a-zA-Z0-9_]+(\.(PCK|SPK|SCR)|:)?/g;
        } else {
            stringRegex = /\*?[a-zA-Z0-9_]+(\.(PCK|SPK|SCR))?/g;
        }

        return document.getWordRangeAtPosition(position, stringRegex);
    }

    /**
     * Checks whether this is a valid translation key
     * @param value
     */
    public static isValidTranslationKey(value: KeyMatch): KeyMatch | undefined {
        if (value.key.match(/^STR_[A-Z0-9_]+$/g)) {
            return value;
        }

        return;
    }

    /**
     * Checks whether this is a valid property
     * @param value
     */
    public static isValidPropertyKey(value: KeyMatch): KeyMatch | undefined {
        if (value.key.match(/:$/g)) {
            return value;
        }

        return;
    }

    /**
     * get the key as text from call range
     * @param range range where call occurs
     * @param document current document
     */
    public static getKeyAtRangeFromDocument(range: Range, document: TextDocument): string {
        return document.getText(range);
    }

    public static getAbsoluteKeyFromPositionInDocument(
        position: Position,
        document: TextDocument,
        includeSemicolon: boolean,
    ): { key: string; range: Range } | undefined {
        const range = KeyDetector.getRangeOfKeyAtPosition(position, document, includeSemicolon);
        if (!range) {
            return;
        }
        const key: string = KeyDetector.getKeyAtRangeFromDocument(range, document);
        logger.debug('getAbsoluteKeyFromPositionInDocument', { key, range });
        if (!KeyDetector.isValidKey(key)) {
            return;
        }

        return { key, range };
    }

    public static findRuleType(position: Position, document: TextDocument): string | undefined {
        const range = KeyDetector.getRangeOfKeyAtPosition(position, document, false);
        if (!range) {
            return;
        }

        const text = document.getText().slice(0, document.offsetAt(range.start));

        for (const line of text.split('\n').reverse()) {
            if (line.trimEnd().match(/^[a-zA-Z]+:$/)) {
                return line.trimEnd().slice(0, -1);
            }
        }

        return;
    }

    public static findRulePath(position: Position, document: TextDocument): string {
        const text = document.getText().slice(0, document.offsetAt(position));

        // return this.generatePathFromDocument(text);

        const simplified = this.getSimplifiedDocument(text);

        return this.generatePathFromDocument(simplified);
    }

    private static getSimplifiedDocument(yamlStr: string): string {
        // Split the YAML into lines and reverse them
        const lines = yamlStr.trim().split('\n').reverse();

        // Placeholder for the reversed hierarchy lines
        const hierarchyLines: string[] = [];
        let currentItemIndentation = Infinity; // Use Infinity to ensure the first line (the target) is always included

        // The last line is our target, so we start from there
        const targetLine = lines[0];
        hierarchyLines.push(targetLine);

        // Extract the indentation level of the target line
        const match = targetLine.match(/^(\s*)/);
        currentItemIndentation = match ? match[1].length : 0;

        // Check if the last line starts with '-'
        let previousLineWasListItem = targetLine.trim().startsWith('-');

        // Iterate over the rest of the lines
        for (const line of lines.slice(1)) {
            // Skip lines starting with '#' or empty lines
            if (line.trim().startsWith('#') || line.trim().length === 0) {
                continue;
            }

            // Determine the indentation of the current line
            const lineIndentation = line.match(/^(\s*)/)?.[1].length ?? 0;
            // Check if the current line starts with '-'
            const currentLineIsListItem = line.trim().startsWith('-');

            // If the current line has less indentation than the previous one, or if both are list items with the same indentation, add it to the hierarchy
            if (
                lineIndentation < currentItemIndentation ||
                (previousLineWasListItem && !currentLineIsListItem && lineIndentation === currentItemIndentation)
            ) {
                hierarchyLines.push(line);
                currentItemIndentation = lineIndentation;
            }

            // Update the flag for the next iteration
            previousLineWasListItem = currentLineIsListItem;

            // Once we reach the top level (no indentation), stop the search
            if (currentItemIndentation === 0) {
                break;
            }
        }

        // Reverse the hierarchy lines back to their original order and join them into a string
        return hierarchyLines.reverse().join('\n');
    }
    private static generatePathFromDocument(yamlStr: string): string {
        const doc = parseDocument(yamlStr);
        let path: string[] = [];

        const traverse = (node: any, currentPath: string[] = []): void => {
            if (!node) {
                return;
            }

            if (node.items) {
                // This node is a Map or Seq
                node.items.forEach((item: any) => {
                    if (item.key && item.value) {
                        // Map item
                        const key = typeof item.key.value === 'string' ? item.key.value : item.key;
                        traverse(item.value, [...currentPath, key]);
                    } else {
                        // Seq item
                        traverse(item, [...currentPath, ...(currentPath.length > 1 ? ['[]'] : [])]);
                    }
                });
            } else if (node.value) {
                // Scalar value
                path = currentPath; // Reached a leaf node, update the path
            }
        };

        traverse(doc.contents);
        return path.join('.').replaceAll('.[]', '[]'); // Format the path, merging sequence indicators
    }
}
