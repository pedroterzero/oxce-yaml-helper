import * as assert from 'assert';
import { resolve } from 'path';
import { EndOfLine, Position, TextDocument, window, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { RulesetCompletionProvider } from '../../rulesetCompletionProvider';
import { waitForRefresh } from './tools';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const fixtureFilePath = resolve(fixturePath, 'completionTest.rul');
const itemsPath = resolve(fixturePath, 'items.rul');

const dummyItems = ['STR_DUMMY_ITEM', 'STR_DUMMY_ITEM2', 'STR_DUMMY_ITEM3'];
const expectedCompletions = [
    {position: new Position(3, 23), completions: dummyItems},
    {position: new Position(6, 40), completions: dummyItems},
    {position: new Position(8, 39), completions: dummyItems},
    {position: new Position(18, 28), completions: dummyItems},
    {position: new Position(22, 35), completions: dummyItems},
    {position: new Position(28, 26), completions: dummyItems},
];

const completionProvider = new RulesetCompletionProvider;

const testCompletion = (document: TextDocument | undefined, entries: typeof expectedCompletions) => {
    if (!document) {
        throw new Error('no document');
    }

    console.log(`document found in testCompletion()`);

    for (const entry of entries) {
        const completions = completionProvider.provideCompletionItems(document, entry.position);
        if (!completions || Object.keys(completions).length === 0) {
            // if (entry.none === true) {
            //     assert.ok('No hover object returned');
            // } else {
                assert.fail('No or empty completions object returned');
            // }
        } else {
            console.log(`expected completions`, entry.completions);
            console.log(`found completions`, completions);

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

        after(async () => {
             // restore this, other tests rely on it
            const document = await workspace.openTextDocument(itemsPath);
            await window.showTextDocument(document);
        });

        it('returns the correct completions', () => {
            testCompletion(document, expectedCompletions);
        });

        it('returns the correct completions (CRLF)', async () => {
            if (!document) {
                throw new Error('no document');
            }

            console.log(`document found`);
            const editor = await window.showTextDocument(document);

            console.log(`document shown`);
            await editor.edit(builder => { builder.setEndOfLine(EndOfLine.CRLF); });
            // save and wait for refresh so we check both CRLF=>LF and vice versa
            console.log(`crlf enabled`);

            await document.save();
            console.log(`saved`);

            await waitForRefresh(rulesetResolver);

            testCompletion(document, expectedCompletions);

            // restore
            await editor.edit(builder => { builder.setEndOfLine(EndOfLine.LF); });
            console.log(`lf restored`);
            await document.save();
            await waitForRefresh(rulesetResolver);
        });
    });
});
