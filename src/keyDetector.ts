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
    public static isValidTranslationKey(value: KeyMatch | undefined): KeyMatch | undefined {
        if (!value) {
            return;
        }

        if (value.key.match(/^STR_[A-Z0-9_]+$/g)) {
            return value;
        }

        return;
    }

    /**
     * Checks whether this is a valid property
     * @param value
     */
    public static isValidPropertyKey(value: KeyMatch | undefined): KeyMatch | undefined {
        if (!value) {
            return;
        }

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
}