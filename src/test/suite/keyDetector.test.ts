import * as assert from 'assert';
import { resolve } from 'path';
import { Position, Range, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { KeyDetector } from '../../keyDetector';
import { waitForExtensionLoad } from './tools';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');
const craftWeaponsPath = resolve(fixturePath, 'craftWeapons.rul');
const completionTestPath = resolve(fixturePath, 'completionTest.rul');
const alienMissionsPath = resolve(fixturePath, 'alienMissions.rul');

before(async () => {
    return waitForExtensionLoad(rulesetResolver);
});

const mockPosition = new Position(1, 18);

describe('keyDetector', () => {
    describe('isValidKey', () => {
        it('validates keys', () => {
            assert.strictEqual(true, KeyDetector.isValidKey('foobar'));
        });

        it('validates STR_ prefixed keys', () => {
            assert.strictEqual(true, KeyDetector.isValidKey('STR_SOMETHING'));
        });

        it('validates numeric string keys', () => {
            assert.strictEqual(true, KeyDetector.isValidKey('12345'));
        });

        it('validates empty string keys', () => {
            assert.strictEqual(true, KeyDetector.isValidKey(''));
        });

        it('rejects non-string values', () => {
            assert.strictEqual(false, KeyDetector.isValidKey(undefined as any));
            assert.strictEqual(false, KeyDetector.isValidKey(null as any));
            assert.strictEqual(false, KeyDetector.isValidKey(123 as any));
        });
    });

    describe('getRangeOfKeyAtPosition', () => {
        it('finds range for a key', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const range = KeyDetector.getRangeOfKeyAtPosition(mockPosition, document, false);
            assert.deepStrictEqual(new Range(1, 10, 1, 24), range);
        });

        it('finds range for a key with semicolon', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const position = new Position(1, 6);
            const range = KeyDetector.getRangeOfKeyAtPosition(position, document, true);
            assert.notStrictEqual(range, undefined);
            // should include the colon
            const text = document.getText(range!);
            assert.ok(text.endsWith(':'), `Expected text to end with colon, got: ${text}`);
        });

        it('returns undefined for position on empty line', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            // line 3 is an empty line in items.rul
            const range = KeyDetector.getRangeOfKeyAtPosition(new Position(3, 0), document, false);
            assert.strictEqual(range, undefined);
        });

        it('finds range for PCK/SPK/SCR file extensions', async () => {
            // line with image_id: UP001.SPK in ufopaedia.rul (0-based line 5)
            const ufoDoc = await workspace.openTextDocument(resolve(fixturePath, 'ufopaedia.rul'));
            const range = KeyDetector.getRangeOfKeyAtPosition(new Position(5, 18), ufoDoc, false);
            assert.notStrictEqual(range, undefined);
            if (range) {
                const text = ufoDoc.getText(range);
                assert.strictEqual(text, 'UP001.SPK');
            }
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

        it('does not validate a lowercase STR_ key', () => {
            const value = {
                key: 'str_something',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(undefined, KeyDetector.isValidTranslationKey(value));
        });

        it('does not validate a key with mixed case after STR_', () => {
            const value = {
                key: 'STR_SomeMixed',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(undefined, KeyDetector.isValidTranslationKey(value));
        });

        it('validates a STR_ key with numbers', () => {
            const value = {
                key: 'STR_ITEM_123',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(value, KeyDetector.isValidTranslationKey(value));
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

        it('does not validate a key without trailing colon', () => {
            const value = {
                key: 'someProperty',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(undefined, KeyDetector.isValidPropertyKey(value));
        });

        it('validates a single-char property key with colon', () => {
            const value = {
                key: 'x:',
                range: new Range(0, 0, 0, 0),
            };

            assert.strictEqual(value, KeyDetector.isValidPropertyKey(value));
        });
    });

    describe('getKeyAtRangeFromDocument', () => {
        it('finds key for a range', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const range = new Range(1, 10, 1, 24);

            assert.strictEqual('STR_DUMMY_ITEM', KeyDetector.getKeyAtRangeFromDocument(range, document));
        });

        it('finds key for a different range', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            // STR_DUMMY_ITEM2 at line 4
            const range = new Range(4, 10, 4, 25);
            assert.strictEqual('STR_DUMMY_ITEM2', KeyDetector.getKeyAtRangeFromDocument(range, document));
        });
    });

    describe('getAbsoluteKeyFromPositionInDocument', () => {
        it('finds key and range for a position', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const expectedResult = {
                key: 'STR_DUMMY_ITEM',
                range: new Range(1, 10, 1, 24),
            };

            assert.deepStrictEqual(expectedResult, KeyDetector.getAbsoluteKeyFromPositionInDocument(mockPosition, document, false));
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

        it('returns undefined for a position on an empty line', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            // empty line
            const result = KeyDetector.getAbsoluteKeyFromPositionInDocument(new Position(3, 0), document, false);
            assert.strictEqual(result, undefined);
        });
    });

    describe('findRuleType', () => {
        it('finds rule type for a position', async () => {
            const document = await workspace.openTextDocument(itemsPath);

            const ruleType = KeyDetector.findRuleType(mockPosition, document);
            assert.strict('items', ruleType);
        });

        it('finds rule type for craftWeapons', async () => {
            const document = await workspace.openTextDocument(craftWeaponsPath);
            const position = new Position(1, 18);
            const ruleType = KeyDetector.findRuleType(position, document);
            assert.strictEqual('craftWeapons', ruleType);
        });

        it('finds rule type for alienMissions', async () => {
            const document = await workspace.openTextDocument(alienMissionsPath);
            const position = new Position(1, 18);
            const ruleType = KeyDetector.findRuleType(position, document);
            assert.strictEqual('alienMissions', ruleType);
        });
    });

    describe('findRulePath', () => {
        it('finds path for a simple type field', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            // position on 'STR_DUMMY_ITEM' at line 1
            const path = KeyDetector.findRulePath(new Position(1, 18), document);
            assert.strictEqual(path, 'items.type');
        });

        it('finds path for a nested field', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            // position on 'STR_DUMMY_AMMO' inside compatibleAmmo array (0-based line 30)
            const path = KeyDetector.findRulePath(new Position(30, 12), document);
            assert.strictEqual(path, 'items.compatibleAmmo[]');
        });

        it('finds path for craftWeapons fields', async () => {
            const document = await workspace.openTextDocument(craftWeaponsPath);
            // launcher field
            const path = KeyDetector.findRulePath(new Position(3, 18), document);
            assert.strictEqual(path, 'craftWeapons.launcher');
        });

        it('finds path for alienMissions raceWeights', async () => {
            const document = await workspace.openTextDocument(alienMissionsPath);
            // alienMissions.raceWeights - STR_DUMMY_RACE at 0-based line 22
            const path = KeyDetector.findRulePath(new Position(22, 12), document);
            assert.ok(path.startsWith('alienMissions.raceWeights'), `Expected path to start with alienMissions.raceWeights, got: ${path}`);
        });

        it('finds path in completionTest for nested alienDeployments data', async () => {
            const document = await workspace.openTextDocument(completionTestPath);
            // inside alienDeployments.data[].itemSets[][]
            const path = KeyDetector.findRulePath(new Position(19, 18), document);
            assert.ok(path.includes('alienDeployments'), `Expected path to include alienDeployments, got: ${path}`);
        });
    });
});