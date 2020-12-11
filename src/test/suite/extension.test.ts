import * as assert from 'assert';
import path = require('path');

const definitions = [
    {
        type: 'items',
        name: 'STR_DUMMY_ITEM'
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

    // before(async (done) => {
    //     let waiting = true;
    //     while (waiting) {
    //         if (workspace.workspaceFolders?.length === 0) {
    //             console.log('wait');
    //             setTimeout(() => { return; }, 5);
    //         } else {
    //             waiting = false;
    //             done();
    //         }
    //     }
    // });
    // workspace.

	describe('activation', async () => {
        it('does load rulesets and returns definitions for existing key', function (done) {
            const testLoad = () => {

            // rulesetResolver.onDidLoad(() => {
                const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));
                assert.notStrictEqual(workspaceFolder, undefined);
                if (!workspaceFolder) {
                    throw new Error('Should not happen');
                }

                for (const def of definitions) {
                    const matches = rulesetTree.getDefinitionsByName(def.name, workspaceFolder, undefined);
                    assert.strictEqual(matches?.length, 1);
                    assert.notStrictEqual(matches.find(match => match.type === def.type), undefined);
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
            // });
        });
    });
});
