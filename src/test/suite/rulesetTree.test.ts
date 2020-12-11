import * as assert from 'assert';
import * as path from 'path';
import { Uri, workspace, WorkspaceFolder } from 'vscode';
import { RulesetTree } from '../../rulesetTree';

const fixturePath = path.resolve(__dirname, '../../../src/test/suite/fixtures');
// const itemsPath = path.resolve(fixturePath, 'items.rul');
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

if (!workspaceFolder) {
    throw new Error('Should not happen');
}

describe('rulesetTree', () => {
    let rulesetTree: RulesetTree;

    const mockWorkSpaceFolder: WorkspaceFolder = {
        name: 'mock',
        uri: Uri.file(fixturePath),
        index: 0
    };

    const mockDefinition = {
        type: 'items',
        name: 'STR_MOCK_ITEM1',
        range: [0, 0],
        rangePosition: [[0, 0], [0, 0]],
    };

    const mockDefinition2 = {
        type: 'items',
        name: 'STR_MOCK_ITEM2',
        range: [0, 0],
        rangePosition: [[0, 0], [0, 0]],
    };

    const mockReference = {
        key: 'STR_MOCK_ITEM',
        path: 'dummy.path',
        range: [0, 0],
    };

    const mockReference2 = {
        key: 'STR_MOCK_ITEM2',
        path: 'dummy.path',
        range: [0, 0],
    };

    const mockTranslation = {
        language: 'en-US',
        key: 'STR_MOCK_ITEM',
        value: 'Mock Item'
    };

    const mockTranslation2 = {
        language: 'en-US',
        key: 'STR_MOCK_ITEM2',
        value: 'Mock Item 2'
    };

    const assertDefinitionExists = (tree: RulesetTree, item: typeof mockDefinition, shouldExist = true) => {
        const matches = tree.getDefinitionsByName(item.name, mockWorkSpaceFolder, undefined);
        assert.strictEqual(matches?.length, shouldExist ? 1 : 0);
        if (shouldExist) {
            assert.notStrictEqual(matches.find(match => match.type === item.type), undefined);
        }
    };

    const assertReferenceExists = (tree: RulesetTree, item: typeof mockReference, shouldExist = true) => {
        const matches = tree.getReferences(mockWorkSpaceFolder)?.filter(ref => ref.key === item.key);
        assert.strictEqual(matches?.length, shouldExist ? 1 : 0);
        // if (shouldExist) {
        //     assert.notStrictEqual(matches.find(ref => ref.path === item.path), undefined);
        // }
    };

    const assertTranslationExists = (tree: RulesetTree, item: typeof mockTranslation, shouldExist = true) => {
        const translation = tree.getTranslation(item.key, mockWorkSpaceFolder);
        assert.strictEqual(translation, shouldExist ? item.value : undefined);
    };

    const addMockDefinition = (tree: RulesetTree, item: typeof mockDefinition, filename = 'dummy.rul') => {
        tree.mergeIntoTree([Object.assign(item)], mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, filename)));
        tree.refresh(mockWorkSpaceFolder);
    };

    const addMockReference = (tree: RulesetTree, item: typeof mockReference, filename = 'dummy.rul') => {
        tree.mergeReferencesIntoTree([Object.assign(item)], mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, filename)));
        tree.refresh(mockWorkSpaceFolder);
    };

    const addMockTranslation = (tree: RulesetTree, item: typeof mockTranslation, filename = 'dummy.rul') => {
        tree.mergeTranslationsIntoTree([Object.assign(item)], mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, filename)));
        tree.refresh(mockWorkSpaceFolder);
    };

    beforeEach(() => {
        rulesetTree = new RulesetTree();
    });

    describe('init', () => {
        context('when rulesets loaded', () => {

            beforeEach(() => {
                addMockDefinition(rulesetTree, mockDefinition);
            });

            it('resets tree state', () => {
                assertDefinitionExists(rulesetTree, mockDefinition);

                rulesetTree.init();

                const matches = rulesetTree.getDefinitionsByName(mockDefinition.name, mockWorkSpaceFolder, undefined);
                assert.strictEqual(matches?.length, 0);
            });
        });
    });

    describe('mergeIntoTree', () => {
        beforeEach(() => {
            rulesetTree.init();
            addMockDefinition(rulesetTree, mockDefinition);
        });

        it('does not overwrite existing definitions for different files', () => {
            assertDefinitionExists(rulesetTree, mockDefinition);
            addMockDefinition(rulesetTree, mockDefinition2, 'dummy2.rul');
            assertDefinitionExists(rulesetTree, mockDefinition);
            assertDefinitionExists(rulesetTree, mockDefinition2);
        });

        it('overwrites existing definitions if same file is loaded', () => {
            assertDefinitionExists(rulesetTree, mockDefinition);
            addMockDefinition(rulesetTree, mockDefinition2, 'dummy.rul');
            assertDefinitionExists(rulesetTree, mockDefinition, false);
            assertDefinitionExists(rulesetTree, mockDefinition2);
        });
    });

    describe('mergeReferencesIntoTree', () => {
        beforeEach(() => {
            rulesetTree.init();
            addMockReference(rulesetTree, mockReference);
        });

        it('does not overwrite existing references for different files', () => {
            assertReferenceExists(rulesetTree, mockReference);
            addMockReference(rulesetTree, mockReference2, 'dummy2.rul');
            assertReferenceExists(rulesetTree, mockReference);
            assertReferenceExists(rulesetTree, mockReference2);
        });

        it('overwrites existing references if same file is loaded', () => {
            assertReferenceExists(rulesetTree, mockReference);
            addMockReference(rulesetTree, mockReference2, 'dummy.rul');
            assertReferenceExists(rulesetTree, mockReference, false);
            assertReferenceExists(rulesetTree, mockReference2);
        });
    });

    describe('mergeTranslationsIntoTree', () => {
        beforeEach(() => {
            rulesetTree.init();
            addMockTranslation(rulesetTree, mockTranslation);
        });

        it('does not overwrite existing translations for different files', () => {
            assertTranslationExists(rulesetTree, mockTranslation);
            addMockTranslation(rulesetTree, mockTranslation2, 'dummy2.rul');
            assertTranslationExists(rulesetTree, mockTranslation);
            assertTranslationExists(rulesetTree, mockTranslation2);
        });

        it('overwrites existing translations if same file is loaded', () => {
            assertTranslationExists(rulesetTree, mockTranslation);
            addMockTranslation(rulesetTree, mockTranslation2, 'dummy.rul');
            assertTranslationExists(rulesetTree, mockTranslation, false);
            assertTranslationExists(rulesetTree, mockTranslation2);
        });
    });
});
