import * as assert from 'assert';
import * as path from 'path';

const definitions = [
    {
        type: 'items',
        name: 'STR_DUMMY_ITEM',
        translation: 'Dummy'
    }
];

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
import { Uri, window, workspace } from 'vscode';
import { rulesetResolver } from "../../extension";
import { rulesetTree } from '../../rulesetTree';

const fixturePath = path.resolve(__dirname, '../../../src/test/suite/fixtures');

describe('Extension Test Suite', () => {
    window.showInformationMessage('Start all tests.');

	describe('activation', async () => {
        it('does load rulesets and returns definitions for existing key', function (done) {
            const testLoad = () => {
                const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));
                assert.notStrictEqual(workspaceFolder, undefined);
                if (!workspaceFolder) {
                    throw new Error('Should not happen');
                }

                for (const def of definitions) {
                    const matches = rulesetTree.getDefinitionsByName(def.name, workspaceFolder, undefined);
                    assert.strictEqual(matches?.length, 1);
                    assert.notStrictEqual(matches.find(match => match.type === def.type), undefined);

                    const translation = rulesetResolver.getTranslationForKey(def.name, workspaceFolder.uri);
                    assert.strictEqual(translation, def.translation);

                    const variables = rulesetTree.getVariables(workspaceFolder);
                    assert.strictEqual(variables && 'ftaGame' in variables, true);
                    assert.strictEqual(variables?.ftaGame, true);
                }

                done();
            };

            if (rulesetResolver.isLoaded()) {
                console.debug('Already loaded');
                testLoad();
            } else {
                console.debug('Listening to onDidLoad');
                rulesetResolver.onDidLoad(testLoad);
            }
        });
    });
});
