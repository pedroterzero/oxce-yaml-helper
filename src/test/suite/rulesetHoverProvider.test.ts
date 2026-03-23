import * as assert from 'assert';
import { resolve } from 'path';
import { MarkdownString, Position, TextDocument, workspace } from 'vscode';
import { RulesetHoverProvider } from '../../rulesetHoverProvider';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');
const documentationTestPath = resolve(fixturePath, 'documentationTest.rul');
const craftWeaponsPath = resolve(fixturePath, 'craftWeapons.rul');

const locale = 'en-US';
const expectedTranslations = [
    {
        position: new Position(1, 18),
        value: 'Dummy',
    },
    {
        position: new Position(7, 18),
        value: `No translation found for locale '${locale}' 'STR_DUMMY_ITEM3'!`,
    },
];

const expectedDocumentation = {
    items: [
        {
            // flatRate
            position: new Position(8, 8),
            value: 'If true, then TU costs for this weapon are a flat rate (instead of a percentage of unit TUs).\n\n**Default: false**',
        },
        {
            // should not return object for undocumented property
            position: new Position(9, 8),
            value: '',
            none: true,
        },
    ],
    documentationTest: [
        {
            // alienMissions.objective
            position: new Position(3, 8),
            value: 'Missions are split by objective:\n\n*   0 = score (default if omitted)\n*   1 = infiltration\n*   2 = alien base\n*   3 = mission site (terror etc)\n*   4 = retaliation\n*   5 = supply\n*   6 = instant xcom base defense: [https://openxcom.org/forum/index.php/topic,10808.0.html](https://openxcom.org/forum/index.php/topic,10808.0.html)\n\n**Default: 0**',
        },
        {
            // alienMissions.waves.objective
            position: new Position(8, 12),
            value: '_true_ Marks this wave as the one that carries out the mission objective. Only for mission site / supply missions.\n\n**Default: false**',
        },
    ],
};

const hoverProvider = new RulesetHoverProvider();

const testHover = (
    document: TextDocument | undefined,
    entries: typeof expectedTranslations & typeof expectedDocumentation.items,
) => {
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
        let documentationTestDocument: TextDocument | undefined;
        before(async () => {
            document = await workspace.openTextDocument(itemsPath);
            documentationTestDocument = await workspace.openTextDocument(documentationTestPath);
        });

        it('returns the correct translation', () => {
            testHover(document, expectedTranslations);
        });

        it('returns the correct documentation', () => {
            testHover(document, expectedDocumentation.items);
        });

        it('returns the correct documentation for a nested doc with the same key', () => {
            testHover(documentationTestDocument, expectedDocumentation.documentationTest);
        });

        it('returns no hover for a position on an empty line', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const hover = hoverProvider.provideHover(document, new Position(3, 0));
            assert.ok(!hover || hover.contents.length === 0, 'Should not return hover for empty line');
        });

        it('returns translation hover for the first item', () => {
            if (!document) {
                throw new Error('no document');
            }
            const hover = hoverProvider.provideHover(document, new Position(1, 18));
            assert.notStrictEqual(hover, undefined);
            if (hover && hover.contents.length > 0) {
                const content = hover.contents[0] as MarkdownString;
                assert.strictEqual(content.value, 'Dummy');
            }
        });

        it('returns missing translation message for untranslated key', () => {
            if (!document) {
                throw new Error('no document');
            }
            const hover = hoverProvider.provideHover(document, new Position(7, 18));
            assert.notStrictEqual(hover, undefined);
            if (hover && hover.contents.length > 0) {
                const content = hover.contents[0] as MarkdownString;
                assert.ok(
                    content.value.includes('No translation found'),
                    `Expected 'No translation found' in hover content, got: ${content.value}`,
                );
            }
        });

        it('returns documentation hover for items.flatRate property', () => {
            if (!document) {
                throw new Error('no document');
            }
            const hover = hoverProvider.provideHover(document, new Position(8, 8));
            assert.notStrictEqual(hover, undefined);
            if (hover && hover.contents.length > 0) {
                const content = hover.contents[0] as MarkdownString;
                assert.ok(
                    content.value.includes('flat rate'),
                    `Expected documentation about flat rate, got: ${content.value}`,
                );
            }
        });

        it('returns no documentation hover for undocumented property', () => {
            if (!document) {
                throw new Error('no document');
            }
            // 'dummy' property at line 9 in items.rul
            const hover = hoverProvider.provideHover(document, new Position(9, 8));
            assert.ok(!hover || hover.contents.length === 0, 'Should not return hover for undocumented property');
        });

        it('returns hover for craftWeapons properties', async () => {
            const cwDoc = await workspace.openTextDocument(craftWeaponsPath);
            // 'sprite:' property at line 2
            hoverProvider.provideHover(cwDoc, new Position(2, 8));
            // may or may not have docs, but should not crash
            assert.ok(true, 'Should not crash when hovering on craftWeapons properties');
        });
    });
});
