import * as assert from 'assert';
import { resolve } from 'path';
import { MarkdownString, Position, TextDocument, workspace } from 'vscode';
import { RulesetHoverProvider } from '../../rulesetHoverProvider';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');

const locale = 'en-US';
const expectedTranslations = [
    {
        position: new Position(1, 18),
        value: 'Dummy'
    },
    {
        position: new Position(7, 18),
        value: `No translation found for locale '${locale}' 'STR_DUMMY_ITEM3'!`
    },
];

const expectedDocumentation = [
    {
        // flatRate
        position: new Position(8, 8),
        value: "If true, then TU costs for this weapon are a flat rate (instead of a percentage of unit TUs).\n\n**Default: false**"
    },
    {
        // should not return object for undocumented property
        position: new Position(9, 8),
        value: "",
        none: true
    }
];

const hoverProvider = new RulesetHoverProvider;

const testHover = (document: TextDocument | undefined, entries: typeof expectedTranslations & typeof expectedDocumentation) => {
    if (!document) {
        throw new Error('no document');
    }

    for (const entry of entries) {
        const hover = hoverProvider.provideHover(document, entry.position);
        if (!hover || hover.contents.length === 0) {
            if (entry.none === true) {
                assert.ok('No hover object returned');
            } else {
                assert.fail('No hover object returned');
            }
        } else {
            const string = hover.contents[0] as MarkdownString;
            assert.strictEqual(entry.value, string.value);
        }
    }
};

describe('hoverProvider', () => {
    describe('provideHover', () => {
        let document: TextDocument | undefined;
        before(async () => {
            document = await workspace.openTextDocument(itemsPath);
         });

        it('returns the correct translation', () => {
            testHover(document, expectedTranslations);
        });

        it('returns the correct documentation', () => {
            testHover(document, expectedDocumentation);
        });
    });
});
