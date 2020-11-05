import { Position, Range, TextDocument } from 'vscode';
import { logger } from './logger';

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
    public static getRangeOfKeyAtPosition(position: Position, document: TextDocument): Range | undefined {
        let stringRegex = /\*[A-Za-z0-9_]+|(\*?[A-Z0-9_]+(\.(PCK|SPK))?)/g;
        return document.getWordRangeAtPosition(position, stringRegex);
    }

    /**
     * get the key as text from call range
     * @param range range where call occurs
     * @param document current document
     */
    public static getKeyAtRangeFromDocument(range: Range, document: TextDocument): string {
        return document.getText(range);
    }

    public static getAbsoluteKeyFromPositionInDocument(position: Position, document: TextDocument): { key: string, range: Range } | null {
        let range = KeyDetector.getRangeOfKeyAtPosition(position, document);
        if (!range) {
            return null;
        }
        let key: string = KeyDetector.getKeyAtRangeFromDocument(range, document);
        logger.debug('getAbsoluteKeyFromPositionInDocument', { key, range });
        if (!KeyDetector.isValidKey(key)) {
            return null;
        }

        // if (parseInt(key).toString() === key) {
        //     // check if we're dealing with a number
        //     key = parseInt(key);
        // }

        return { key, range };
    }
}