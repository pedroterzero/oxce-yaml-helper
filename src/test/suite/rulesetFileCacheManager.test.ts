import * as assert from 'assert';
import { appendFile, readFile, writeFile } from 'fs-extra';
import { resolve } from 'path';
import { Uri, workspace } from 'vscode';
import { rulesetFileCacheManager } from '../../rulesetFileCacheManager';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const itemsPath = resolve(fixturePath, 'items.rul');
const itemsUri = Uri.file(itemsPath);
let originalSetting: string | undefined;

const mockData = {
    translations: [
        {language: 'en-US', key: 'STR_DUMMY', value: 'DUMMY'}
    ]
};

const mockFile = resolve(fixturePath, 'mock.txt');


before(() => {
    originalSetting = workspace.getConfiguration('oxcYamlHelper').get<string>('cacheStrategy');
});

afterEach(async () => {
    await workspace.getConfiguration('oxcYamlHelper').update('cacheStrategy', originalSetting);
});

describe('rulesetFileCacheManager', () => {
    describe('put', () => {
        it('stores cache data', async () => {
            await workspace.getConfiguration('oxcYamlHelper').update('cacheStrategy', 'all');

            await rulesetFileCacheManager.put(Uri.file(mockFile), mockData);
            assert.notStrictEqual(undefined, await rulesetFileCacheManager.retrieve(Uri.file(mockFile)));

            rulesetFileCacheManager.remove(Uri.file(mockFile));
        });
    });

    describe('remove', () => {
        it('removes cache data', async () => {
            await workspace.getConfiguration('oxcYamlHelper').update('cacheStrategy', 'all');

            await rulesetFileCacheManager.put(Uri.file(mockFile), mockData);
            assert.notStrictEqual(undefined, await rulesetFileCacheManager.retrieve(Uri.file(mockFile)));

            rulesetFileCacheManager.remove(Uri.file(mockFile));
            assert.strictEqual(undefined, await rulesetFileCacheManager.retrieve(Uri.file(mockFile)));
        });
    });

    describe('retrieve', () => {
        it('returns cached data when expected', async () => {
            await workspace.getConfiguration('oxcYamlHelper').update('cacheStrategy', 'nothing');
            let data = await rulesetFileCacheManager.retrieve(itemsUri);
            assert.strictEqual(undefined, data);

            await workspace.getConfiguration('oxcYamlHelper').update('cacheStrategy', 'all');
            data = await rulesetFileCacheManager.retrieve(itemsUri);
            assert.notStrictEqual(undefined, data);
        });

        it('returns no cached data if file is changed', async () => {
            await workspace.getConfiguration('oxcYamlHelper').update('cacheStrategy', 'all');
            // retrieve twice to be sure it's cached
            await rulesetFileCacheManager.retrieve(itemsUri);
            assert.notStrictEqual(undefined, await rulesetFileCacheManager.retrieve(itemsUri));

            // edit the file
            const testData = '# test';
            await appendFile(itemsPath, testData);
            assert.strictEqual(undefined, await rulesetFileCacheManager.retrieve(itemsUri));

            // remove the test data
            const fileData = await readFile(itemsPath);
            await writeFile(itemsPath, fileData.slice(0, -1 * testData.length));
        });
    });
});
