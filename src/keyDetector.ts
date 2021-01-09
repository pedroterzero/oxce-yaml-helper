import { Position, Range, TextDocument } from 'vscode';
import { logger } from './logger';

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
        return typeof key === "string";
    }

    /**
     * find a key at position and return its range
     * @param position position to look for the key
     * @param document current document
     */
    public static getRangeOfKeyAtPosition(position: Position, document: TextDocument, includeSemicolon: boolean): Range | undefined {
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

    public static getAbsoluteKeyFromPositionInDocument(position: Position, document: TextDocument, includeSemicolon: boolean): { key: string, range: Range } | undefined {
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

        for (const line of text.split("\n").reverse()) {
            if (line.trimEnd().match(/^[a-zA-Z]+:$/)) {
                return line.trimEnd().slice(0, -1);
            }
        }

        return;
    }

    public static findRulePath(position: Position, document: TextDocument): string {
        const text = document.getText().slice(0, document.offsetAt(position));

        const lines = text.split("\n").reverse();
        const editLine = lines.shift();
        const matches = editLine?.match(/^(\s+)([a-zA-Z0-9-]+)(:(?:\s*\[\s*\[)?)?/);
        const path = [];

        let indent = 2;
        if (matches) {
            indent = matches[1].length;
            if (matches[3] === ':') {
                path.push(matches[2]);
            } else if (matches[3]?.match(/:\s*\[\s*\[/)) {
                path.push(matches[2] + '[]');
            }
        }

        let prevLine = '';
        for (const line of lines) {
            const parentRegex = new RegExp(`^(\\s{1,${indent - 1}})([a-zA-Z]+|[0-9]+):(\\s*&[a-zA-Z0-9]+|\\s*\\[)?$`); // could be a trailing & reference

            let matches;
            if (line.trimEnd().match(/^[a-zA-Z]+:$/)) {
                path.push(line.trimEnd().slice(0, -1));
                break;
            } else if ((matches = parentRegex.exec(line.trimEnd()))) {
                indent = matches[1].length;

                // is this parent followed by an array or was previous line an array?
                let isArray = matches[3]?.trim() === '[';
                let prevLineMatches;
                if (!isArray && (prevLineMatches = new RegExp(`^\\s{${indent + 1},}-([^:]+:[^:]+)?$`).exec(prevLine))) {
                    // if the previous line started with - and it had a : after that, it's an (unnamed) array
                    isArray = true;
                }

                path.push(matches[2] + (isArray ? '[]' : ''));
            }

            prevLine = line;
        }

        const foundPath = path.reverse().join('.');

        logger.debug(`Found path: ${foundPath}`);

        return foundPath;
    }
}