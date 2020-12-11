import * as assert from 'assert';
import * as path from 'path';
import { Range, Uri, workspace } from 'vscode';
import { RulesetDefinitionProvider } from '../../rulesetDefinitionProvider';

const rulesetDefinitionProvider = new RulesetDefinitionProvider();
const fixturePath = path.resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = path.resolve(fixturePath, 'items.rul');
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

if (!workspaceFolder) {
    throw new Error('Should not happen');
}

describe("Definition Provider", () => {
    describe('provideDefinition', () => {
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
    });
});
