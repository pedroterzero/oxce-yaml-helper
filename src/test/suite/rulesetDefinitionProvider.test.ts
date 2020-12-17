import * as assert from 'assert';
import * as path from 'path';
import { Location, Position, Uri, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { RulesetDefinitionProvider } from '../../rulesetDefinitionProvider';
import { waitForExtensionLoad } from './tools';

const rulesetDefinitionProvider = new RulesetDefinitionProvider();
const fixturePath = path.resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = path.resolve(fixturePath, 'items.rul');
const itemsUri = Uri.file(itemsPath);
const extraSpritesPath = path.resolve(fixturePath, 'extraSprites.rul');
const extraSpritesUri = Uri.file(extraSpritesPath);
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

if (!workspaceFolder) {
    throw new Error('Should not happen');
}

const checkDefinitions = async (sourcePath: string, sourceLine: number, sourceChar: number, uri: Uri, startLine: number, startChar: number, endLine: number, endChar: number) => {
    const document = await workspace.openTextDocument(sourcePath);
    const definitions = rulesetDefinitionProvider.provideDefinition(document, new Position(sourceLine, sourceChar));

    if (!definitions) {
        assert.fail('Did not get a definition');
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

describe("Definition Provider", () => {
    before(async () => {
        return waitForExtensionLoad(rulesetResolver);
    });

    describe('provideDefinition', () => {
        it('finds definition for a key', async () => {
            checkDefinitions(itemsPath, 1, 18, itemsUri, 1, 10, 1, 24);
        });

        it('finds definition for a bulletsprite key', async () => {
            checkDefinitions(itemsPath, 12, 19, extraSpritesUri, 7, 6, 7, 9);
        });

        it('finds definition for a bulletsprite key that is in a multi bulletSprite definition', async () => {
            checkDefinitions(itemsPath, 15, 19, extraSpritesUri, 14, 6, 14, 9);
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
