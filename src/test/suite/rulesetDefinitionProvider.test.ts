import * as assert from 'assert';
import * as path from 'path';
import { Position, Uri, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { RulesetDefinitionProvider } from '../../rulesetDefinitionProvider';
import { waitForExtensionLoad } from './tools';

const rulesetDefinitionProvider = new RulesetDefinitionProvider();
const fixturePath = path.resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = path.resolve(fixturePath, 'items.rul');
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

if (!workspaceFolder) {
    throw new Error('Should not happen');
}

describe("Definition Provider", () => {
    before(async () => {
        return waitForExtensionLoad(rulesetResolver);
    });

    describe('provideDefinition', () => {
        it('finds definition for a key', async () => {
            const document = await workspace.openTextDocument(itemsPath);
            const definitions = rulesetDefinitionProvider.provideDefinition(document, new Position(1, 18));
            const uri = Uri.file(itemsPath);

            if (!definitions) {
                assert.fail('Did not get a definition');
                return;
            }

            if (!('length' in definitions)) {
                assert.fail('Did not get a definition array');
                return;
            }

            assert.strictEqual(definitions.length, 1);
            assert.strictEqual(definitions[0].uri.path, uri.path);
            assert.strictEqual(definitions[0].range.start.line, 1);
            assert.strictEqual(definitions[0].range.start.character, 10);
            assert.strictEqual(definitions[0].range.end.line, 1);
            assert.strictEqual(definitions[0].range.end.character, 24);
        });
    });

/*     describe('getDefinitions', () => {
        // /** @private @deprecated only for testing, do not use (we can't mock TextDocument) *//*
        // public _testGetDefinitions(value: { key: string; range: Range; }, folder: WorkspaceFolder) {
        //     return this.getDefinitions(value, folder);
        // }

        it('returns the correct range', () => {
            const uri = Uri.file(itemsPath);
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
