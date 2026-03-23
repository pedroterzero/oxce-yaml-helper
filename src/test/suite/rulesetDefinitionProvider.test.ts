import * as assert from 'assert';
import { readFile, remove, writeFile } from 'fs-extra';
import { resolve } from 'path';
import { EndOfLine, Location, Position, TextDocument, TextEditor, Uri, window, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { RulesetDefinitionProvider } from '../../rulesetDefinitionProvider';
import { RulesetResolver } from '../../rulesetResolver';
import { waitForExtensionLoad, waitForRefresh } from './tools';

const rulesetDefinitionProvider = new RulesetDefinitionProvider();
const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');
const itemsDeletePath = resolve(fixturePath, 'items-delete-test.rul');
const itemsUri = Uri.file(itemsPath);
const itemsDeleteUri = Uri.file(itemsDeletePath);
const extraSpritesPath = resolve(fixturePath, 'extraSprites.rul');
const extraSpritesUri = Uri.file(extraSpritesPath);
const manufacturePath = resolve(fixturePath, 'manufacture.rul');
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

if (!workspaceFolder) {
    throw new Error('Should not happen');
}

const getDefinitions = async (sourcePath: string, sourceLine: number, sourceChar: number, uri?: Uri, show = false) => {
    const document = await workspace.openTextDocument(sourcePath);
    if (show) {
        await window.showTextDocument(document);
    }
    const definitions = rulesetDefinitionProvider.provideDefinition(document, new Position(sourceLine, sourceChar));

    if (!definitions || ('length' in definitions && definitions.length === 0)) {
        if (uri) {
            assert.fail('Did not get a definition');
        } else {
            assert.ok('Did not get a definition');
        }
        return;
    }

    return definitions;
};

const checkDefinitionSingle = async (
    sourcePath: string,
    sourceLine: number,
    sourceChar: number,
    uri?: Uri,
    startLine?: number,
    startChar?: number,
    endLine?: number,
    endChar?: number,
) => {
    const definitions = await getDefinitions(sourcePath, sourceLine, sourceChar, uri);

    if (!definitions) {
        return;
    }

    if (!uri || !startLine || !startChar || !endLine || !endChar) {
        assert.fail('Required parameters missing, if a definition was found');
        return;
    }

    if (!('length' in definitions)) {
        assert.fail('Did not get a definition array');
        return;
    }

    assert.strictEqual(definitions.length, 1);
    checkDefinitionTarget(definitions[0], uri, startLine, startChar, endLine, endChar);
};

const checkDefinitionTarget = (
    definition: Location,
    uri: Uri,
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number,
) => {
    assert.strictEqual(definition.uri.path, uri.path);
    assert.strictEqual(definition.range.start.line, startLine);
    assert.strictEqual(definition.range.start.character, startChar);
    assert.strictEqual(definition.range.end.line, endLine);
    assert.strictEqual(definition.range.end.character, endChar);
};

const deleteTestFile = async (path: string, resolver: RulesetResolver) => {
    const contents = await readFile(path);

    await Promise.all([waitForRefresh(resolver), remove(path)]);

    return contents;
};

describe('Definition Provider', () => {
    before(async () => {
        return waitForExtensionLoad(rulesetResolver);
    });

    describe('provideDefinition', () => {
        it('finds definition for a key', async () => {
            await checkDefinitionSingle(itemsPath, 1, 18, itemsUri, 1, 10, 1, 24);
        });

        it('finds definition for a bulletsprite key', async () => {
            await checkDefinitionSingle(itemsPath, 12, 19, extraSpritesUri, 7, 6, 7, 9);
        });

        it('finds definition for a bulletsprite key that is in a multi bulletSprite definition', async () => {
            await checkDefinitionSingle(itemsPath, 15, 19, extraSpritesUri, 14, 6, 14, 9);
        });

        it('finds definition for a key with a comment', async () => {
            await checkDefinitionSingle(itemsPath, 32, 14, itemsUri, 32, 10, 32, 26);
        });

        describe('Definition finding tests (CRLF)', () => {
            let document: TextDocument;
            let editor: TextEditor;

            before(async () => {
                document = await workspace.openTextDocument(itemsPath);
                editor = await window.showTextDocument(document);

                await editor.edit((builder) => {
                    builder.setEndOfLine(EndOfLine.CRLF);
                });
                // save and wait for refresh so we check both CRLF=>LF and vice versa
                await document.save();
                await waitForRefresh(rulesetResolver);
            });

            it('finds definition in correct place for CRLF files - test 1', async () => {
                await checkDefinitionSingle(itemsPath, 1, 18, itemsUri, 1, 10, 1, 24);
            });

            it('finds definition in correct place for CRLF files - test 2', async () => {
                await checkDefinitionSingle(itemsPath, 12, 19, extraSpritesUri, 7, 6, 7, 9);
            });

            it('finds definition in correct place for CRLF files - test 3', async () => {
                await checkDefinitionSingle(itemsPath, 15, 19, extraSpritesUri, 14, 6, 14, 9);
            });

            after(async () => {
                // restore
                await editor.edit((builder) => {
                    builder.setEndOfLine(EndOfLine.LF);
                });
                await document.save();
                await waitForRefresh(rulesetResolver);
            });
        });

        it('does not find deleted definitions', async () => {
            await checkDefinitionSingle(manufacturePath, 3, 8, itemsDeleteUri, 1, 10, 1, 30);

            const contents = await deleteTestFile(itemsDeletePath, rulesetResolver);
            await checkDefinitionSingle(manufacturePath, 3, 8);

            // restore file
            await writeFile(itemsDeletePath, contents);
        });

        it('does not find a undefinable numeric property', async () => {
            await checkDefinitionSingle(itemsPath, 23, 15);
        });

        it('does not find a quoted string id', async () => {
            await checkDefinitionSingle(itemsPath, 37, 14);
        });

        it('finds definition for a hitAnimation key that points to X1.PCK', async () => {
            await checkDefinitionSingle(itemsPath, 51, 18, extraSpritesUri, 28, 6, 28, 8);
        });

        it('does not find definition for a hitAnimation key that points to X1.PCK which does not exist', async () => {
            await checkDefinitionSingle(itemsPath, 56, 18);
        });

        it('finds definition for a hitAnimation key that points to SMOKE.PCK (because of blastRadius=0)', async () => {
            await checkDefinitionSingle(itemsPath, 61, 18, extraSpritesUri, 45, 6, 45, 9);
        });

        it('finds definition for a hitAnimation key that points to SMOKE.PCK (because of FixRadius=0)', async () => {
            await checkDefinitionSingle(itemsPath, 66, 18, extraSpritesUri, 45, 6, 45, 9);
        });

        it('finds definition for a hitAnimation key that points to SMOKE.PCK (because of damageType)', async () => {
            await checkDefinitionSingle(itemsPath, 72, 18, extraSpritesUri, 45, 6, 45, 9);
        });

        after(async () => {
            const document = await workspace.openTextDocument(itemsPath);
            await window.showTextDocument(document);
        });

        it('finds definitions for a craftWeapons.sprite key', async () => {
            const definitions = await getDefinitions(
                resolve(fixturePath, 'craftWeapons.rul'),
                2,
                13,
                extraSpritesUri,
                true,
            );

            if (!definitions || !('length' in definitions)) {
                assert.fail('Did not get definitions');
            }

            assert.strictEqual(definitions.length, 2);
            checkDefinitionTarget(definitions[0], extraSpritesUri, 37, 6, 37, 9);
            checkDefinitionTarget(definitions[1], extraSpritesUri, 40, 6, 40, 9);
        });

        it('finds refnode definition', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const definition = rulesetDefinitionProvider.provideDefinition(document, new Position(5, 15));

            if (!definition) {
                assert.fail('Did not get a definition');
                return;
            }

            if (!('uri' in definition)) {
                assert.fail('Did not get a definition');
                return;
            }

            /// yaml2 no longer includes the anchor in the range
            // checkDefinitionTarget(definition, itemsUri, 2, 10, 2, 28);
            checkDefinitionTarget(definition, itemsUri, 2, 25, 2, 28);
        });
    });

    /*     describe('getDefinitions', () => {
        // /** @private @deprecated only for testing, do not use (we can't mock TextDocument) */
    /*
        // public _testGetDefinitions(value: { key: string; range: Range; }, folder: WorkspaceFolder) {
        //     return this.getDefinitions(value, folder);
        // }

        it('returns the correct range', () => {
            const uri = itemsUri;
            const definitions = rulesetDefinitionProvider._testGetDefinitions(
                { key: 'STR_DUMMY_ITEM', range: new Range(0, 0, 0, 0) },
                workspaceFolder,
            );
            assert.strictEqual(definitions.length, 1);
            assert.strictEqual(definitions[0].uri.path, uri.path);
            assert.strictEqual(definitions[0].range.start.line, 1);
            assert.strictEqual(definitions[0].range.start.character, 10);
            assert.strictEqual(definitions[0].range.end.line, 1);
            assert.strictEqual(definitions[0].range.end.character, 24);
        });
    }); */

    describe('provideDefinition - additional cases', () => {
        it('finds definition for a craft reference in manufacture', async () => {
            // manufacture.rul producedItems references STR_DUMMY_CRAFT which is a craft
            const craftsPath = resolve(fixturePath, 'crafts.rul');
            const craftsUri = Uri.file(craftsPath);
            await checkDefinitionSingle(manufacturePath, 12, 8, craftsUri, 1, 10, 1, 25);
        });

        it('finds definition for a research reference', async () => {
            const researchPath = resolve(fixturePath, 'research.rul');
            const researchUri = Uri.file(researchPath);
            await checkDefinitionSingle(manufacturePath, 49, 18, researchUri, 1, 10, 1, 28);
        });

        it('does not find definition for a non-existing reference', async () => {
            // STR_DUMMY_NON_EXISTING_REFERENCE in manufacture.rul
            await checkDefinitionSingle(manufacturePath, 16, 8);
        });

        it('finds definition for alienRace member unit', async () => {
            const alienRacesPath = resolve(fixturePath, 'alienRaces.rul');
            const unitsPath = resolve(fixturePath, 'units.rul');
            const unitsUri = Uri.file(unitsPath);
            // STR_DUMMY_UNIT_ALIEN_RACE_TEST in alienRaces.rul
            await checkDefinitionSingle(alienRacesPath, 4, 10, unitsUri, 4, 10, 4, 40);
        });

        it('finds definition for craftWeapons clip reference to an item', async () => {
            const craftWeaponsPath = resolve(fixturePath, 'craftWeapons.rul');
            // STR_DUMMY_ITEM at craftWeapons.rul STR_CRAFT_WEAPON_CLIP_TEST clip line
            await checkDefinitionSingle(craftWeaponsPath, 21, 12, itemsUri, 1, 10, 1, 24);
        });

        it('finds definition for soldierTransformation soldierBonusType', async () => {
            const soldierTransPath = resolve(fixturePath, 'soldierTransformation.rul');
            const soldierBonusesPath = resolve(fixturePath, 'soldierBonuses.rul');
            const soldierBonusesUri = Uri.file(soldierBonusesPath);
            // STR_DUMMY_BONUS in soldierTransformation.rul
            await checkDefinitionSingle(soldierTransPath, 11, 24, soldierBonusesUri, 1, 10, 1, 25);
        });
    });
});
