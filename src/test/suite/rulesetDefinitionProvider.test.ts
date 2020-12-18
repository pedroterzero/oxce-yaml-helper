import * as assert from 'assert';
import { readFile, remove, writeFile } from 'fs-extra';
import { resolve } from 'path';
import { EndOfLine, Location, Position, Uri, window, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { RulesetDefinitionProvider } from '../../rulesetDefinitionProvider';
import { RulesetResolver } from '../../rulesetResolver';
import { waitForExtensionLoad, waitForRefresh } from './tools';

const rulesetDefinitionProvider = new RulesetDefinitionProvider();
const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');
const itemsUri = Uri.file(itemsPath);
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

const checkDefinitionSingle = async (sourcePath: string, sourceLine: number, sourceChar: number, uri?: Uri, startLine?: number, startChar?: number, endLine?: number, endChar?: number) => {
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

const checkDefinitionTarget = (definition: Location, uri: Uri, startLine: number, startChar: number, endLine: number, endChar: number) => {
    assert.strictEqual(definition.uri.path, uri.path);
    assert.strictEqual(definition.range.start.line, startLine);
    assert.strictEqual(definition.range.start.character, startChar);
    assert.strictEqual(definition.range.end.line, endLine);
    assert.strictEqual(definition.range.end.character, endChar);
};

const deleteTestFile = async (path: string, resolver: RulesetResolver) => {
    const contents = await readFile(path);

    await Promise.all([
        waitForRefresh(resolver),
        remove(path)
    ]);

    return contents;
};

describe("Definition Provider", () => {
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
            await checkDefinitionSingle(itemsPath, 32, 14, itemsUri, 32, 10, 32, 40);
        });

        it('finds definition in correct place for CRLF files', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const editor = await window.showTextDocument(document);

            await editor.edit(builder => { builder.setEndOfLine(EndOfLine.CRLF); });
            // save and wait for refresh so we check both CRLF=>LF and vice versa
            await document.save();
            await waitForRefresh(rulesetResolver);

            // same as above
            await checkDefinitionSingle(itemsPath, 1, 18, itemsUri, 1, 10, 1, 24);
            await checkDefinitionSingle(itemsPath, 12, 19, extraSpritesUri, 7, 6, 7, 9);
            await checkDefinitionSingle(itemsPath, 15, 19, extraSpritesUri, 14, 6, 14, 9);

            // restore
            await editor.edit(builder => { builder.setEndOfLine(EndOfLine.LF); });
            await document.save();
            await waitForRefresh(rulesetResolver);
        });

        it('does not find deleted definitions', async () => {
            await checkDefinitionSingle(manufacturePath, 3, 8, itemsUri, 1, 10, 1, 24);

            const contents = await deleteTestFile(itemsPath, rulesetResolver);
            await checkDefinitionSingle(manufacturePath, 3, 8);

            // restore file
            await writeFile(itemsPath, contents);
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

        it('finds definitions for a craftWeapons.sprite key', async () => {
            const definitions = await getDefinitions(resolve(fixturePath, 'craftWeapons.rul'), 2, 13, extraSpritesUri, true);

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

            checkDefinitionTarget(definition, itemsUri, 2, 10, 2, 28);
        });
    });

/*     describe('getDefinitions', () => {
        // /** @private @deprecated only for testing, do not use (we can't mock TextDocument) *//*
        // public _testGetDefinitions(value: { key: string; range: Range; }, folder: WorkspaceFolder) {
        //     return this.getDefinitions(value, folder);
        // }

        it('returns the correct range', () => {
            const uri = itemsUri;
            const definitions = rulesetDefinitionProvider._testGetDefinitions({key: 'STR_DUMMY_ITEM', range: new Range(0, 0, 0, 0)}, workspaceFolder);
            assert.strictEqual(definitions.length, 1);
            assert.strictEqual(definitions[0].uri.path, uri.path);
            assert.strictEqual(definitions[0].range.start.line, 1);
            assert.strictEqual(definitions[0].range.start.character, 10);
            assert.strictEqual(definitions[0].range.end.line, 1);
            assert.strictEqual(definitions[0].range.end.character, 24);
        });
    }); */
});
