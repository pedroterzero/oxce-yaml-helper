import * as assert from 'assert';
import { resolve } from 'path';
import { Position, TextDocument, workspace } from 'vscode';
import { RulesetCompletionProvider } from '../../rulesetCompletionProvider';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const fixtureFilePath = resolve(fixturePath, 'completionTest.rul');

const dummyItems = ['STR_DUMMY_ITEM', 'STR_DUMMY_ITEM2', 'STR_DUMMY_ITEM3'];
const expectedCompletions = [
    {position: new Position(3, 23), completions: dummyItems},
    {position: new Position(6, 40), completions: dummyItems},
    {position: new Position(16, 28), completions: dummyItems},
    {position: new Position(20, 35), completions: dummyItems},
    {position: new Position(26, 26), completions: dummyItems},
];

const completionProvider = new RulesetCompletionProvider;

const testCompletion = (document: TextDocument | undefined, entries: typeof expectedCompletions) => {
    if (!document) {
        throw new Error('no document');
    }

    for (const entry of entries) {
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
    }
};

describe('rulesetCompletionProvider', () => {
    describe('provideCompletionItems', () => {
        let document: TextDocument | undefined;
        before(async () => {
            document = await workspace.openTextDocument(fixtureFilePath);
         });

        it('returns the correct completions', () => {
            testCompletion(document, expectedCompletions);
        });
    });
});
