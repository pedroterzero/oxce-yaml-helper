import * as assert from 'assert';
import { resolve } from 'path';
import { Position, Range, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { KeyDetector } from '../../keyDetector';
import { waitForExtensionLoad } from './tools';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');

before(async () => {
    return waitForExtensionLoad(rulesetResolver);
});

describe("keyDetector", () => {
    describe('isValidKey', () => {
        it('validates keys', () => {
            assert.strictEqual(true, KeyDetector.isValidKey('foobar'));
        });
    });

    describe('getRangeOfKeyAtPosition', () => {
        it('finds range for a key', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const range = KeyDetector.getRangeOfKeyAtPosition(new Position(1, 18), document, false);
            assert.deepStrictEqual(new Range(1, 10, 1, 24), range);
        });
    });

    describe('isValidTranslationKey', () => {
        it('validates a translation string', () => {
            const value = {
                key: 'STR_DUMMY_STRING',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(value, KeyDetector.isValidTranslationKey(value));
        });

        it('does not validate a non-translation string', () => {
            const value = {
                key: 'DUMMY_STRING',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(undefined, KeyDetector.isValidTranslationKey(value));
        });

    });

    describe('isValidPropertyKey', () => {
        it('validates a property key', () => {
            const value = {
                key: 'foobar:',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(value, KeyDetector.isValidPropertyKey(value));
        });

        it('does not validate a non-property string', () => {
            const value = {
                key: 'STR_DUMMY_STRING',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(undefined, KeyDetector.isValidPropertyKey(value));
        });
    });

    describe('getKeyAtRangeFromDocument', () => {
        it('finds key for a range', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const range = new Range(1, 10, 1, 24);

            assert.strictEqual('STR_DUMMY_ITEM', KeyDetector.getKeyAtRangeFromDocument(range, document));
        });
    });

    describe('getAbsoluteKeyFromPositionInDocument', () => {
        it('finds key and range for a position', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const position = new Position(1, 18);
            const expectedResult = {
                key: 'STR_DUMMY_ITEM',
                range: new Range(1, 10, 1, 24),
            };

            assert.deepStrictEqual(expectedResult, KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document, false));
        });

        it('finds key and range for a position that is a key (not a value)', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const position = new Position(1, 6);
            const expectedResult = {
                key: 'type:',
                range: new Range(1, 4, 1, 9),
            };

            assert.deepStrictEqual(expectedResult, KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document, true));
        });
    });
});