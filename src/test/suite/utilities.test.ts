import * as assert from 'assert';
import { Uri, workspace } from 'vscode';
import { getModRootUri, pathStartsWith } from '../../utilities';

afterEach(async () => {
    await workspace.getConfiguration('oxcYamlHelper').update('modRoot', undefined);
});

describe('utilities', () => {
    describe('getModRootUri', () => {
        const workspaceFolder = workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('Should not happen');
        }

        it('returns the workspace folder when modRoot is unset', async () => {
            const uri = getModRootUri(workspaceFolder);
            assert.strictEqual(uri.toString(), workspaceFolder.uri.toString());
        });

        it('returns the workspace folder when modRoot is blank or "."', async () => {
            for (const modRoot of ['', '   ', '.']) {
                await workspace.getConfiguration('oxcYamlHelper').update('modRoot', modRoot);
                const uri = getModRootUri(workspaceFolder);
                assert.strictEqual(uri.toString(), workspaceFolder.uri.toString());
            }
        });

        it('resolves a nested mod root relative to the workspace folder', async () => {
            await workspace.getConfiguration('oxcYamlHelper').update('modRoot', 'content/From the Ashes');
            const uri = getModRootUri(workspaceFolder);
            assert.strictEqual(uri.toString(), Uri.joinPath(workspaceFolder.uri, 'content/From the Ashes').toString());
        });

        it('normalizes Windows-style backslashes in the configured path', async () => {
            await workspace.getConfiguration('oxcYamlHelper').update('modRoot', 'content\\From the Ashes');
            const uri = getModRootUri(workspaceFolder);
            assert.strictEqual(uri.toString(), Uri.joinPath(workspaceFolder.uri, 'content/From the Ashes').toString());
        });
    });

    describe('pathStartsWith', () => {
        it('returns false when the parent path is undefined', () => {
            const file = Uri.file('/some/mod/items.rul');
            assert.strictEqual(pathStartsWith(file, undefined), false);
        });

        it('returns true when the file is under the parent path', () => {
            const parent = Uri.file('/some/mod');
            const file = Uri.file('/some/mod/items.rul');
            assert.strictEqual(pathStartsWith(file, parent), true);
        });

        it('returns false when the file is not under the parent path', () => {
            const parent = Uri.file('/some/other-mod');
            const file = Uri.file('/some/mod/items.rul');
            assert.strictEqual(pathStartsWith(file, parent), false);
        });
    });
});
