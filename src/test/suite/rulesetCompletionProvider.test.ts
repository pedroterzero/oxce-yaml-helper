import * as assert from 'assert';
import { resolve } from 'path';
import { Position, TextDocument, window, workspace } from 'vscode';
import { RulesetCompletionProvider } from '../../rulesetCompletionProvider';
import { switchLineEndings } from './tools';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const fixtureFilePath = resolve(fixturePath, 'completionTest.rul');
const itemsPath = resolve(fixturePath, 'items.rul');

const dummyItems = ['STR_DUMMY_ITEM', 'STR_DUMMY_ITEM2', 'STR_DUMMY_ITEM3'];
const expectedCompletions = [
    { position: new Position(3, 23), completions: dummyItems },
    { position: new Position(6, 40), completions: dummyItems },
    { position: new Position(8, 39), completions: dummyItems },
    { position: new Position(18, 28), completions: dummyItems },
    { position: new Position(22, 35), completions: dummyItems },
    { position: new Position(28, 26), completions: dummyItems },
];

const completionProvider = new RulesetCompletionProvider;

const testCompletion = (filepath: string, entries: typeof expectedCompletions) => {
    let document: TextDocument | undefined;
    before(async () => {
        document = await workspace.openTextDocument(filepath);
    });

    for (const entry of entries) {
        it(`returns the correct completions at ${entry.position.line}:${entry.position.character}`, () => {
            if (!document) {
                throw new Error('no document');
            }

            const completions = completionProvider.provideCompletionItems(document, entry.position);
            if (!completions || Object.keys(completions).length === 0) {
                // if (entry.none === true) {
                //     assert.ok('No hover object returned');
                // } else {
                assert.fail('No or empty completions object returned');
                // }
            } else {
                assert.strictEqual(Object.keys(completions).length, entry.completions.length);
                assert.strictEqual(
                    undefined,
                    entry.completions.find(expected => !Object.values(completions).find(completion => expected === completion.label))
                );
            }
        });
    }
};



describe('rulesetCompletionProvider', () => {
    describe('provideCompletionItems', () => {
        testCompletion(fixtureFilePath, expectedCompletions);
    });

    before(async () => {
        await switchLineEndings(fixtureFilePath, 'CRLF');
    });

    after(async () => {
        await switchLineEndings(fixtureFilePath, 'LF');
    });

    after(async () => {
        // restore this, other tests rely on it
        const document = await workspace.openTextDocument(itemsPath);
        await window.showTextDocument(document);
    });

    describe('provideCompletionItems (CRLF)', () => {
        testCompletion(fixtureFilePath, expectedCompletions);
    });
});