import * as assert from 'assert';
import * as path from 'path';
import { Uri, workspace, WorkspaceFolder } from 'vscode';
import { RulesetTree, rulesetTree as fixtureRulesetTree } from '../../rulesetTree';

const fixturePath = path.resolve(__dirname, '../../../src/test/suite/fixtures');
// const itemsPath = path.resolve(fixturePath, 'items.rul');const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

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

    const assertDefinitionExists = (tree: RulesetTree, item: typeof mockDefinition, shouldExist = true, workspace = mockWorkSpaceFolder) => {
        const matches = tree.getDefinitionsByName(item.name, workspace, undefined);
        assert.strictEqual(matches?.length, shouldExist ? 1 : 0);
        if (shouldExist) {
            assert.notStrictEqual(matches.find(match => match.type === item.type), undefined);
        }
    };

    const assertReferenceExists = (tree: RulesetTree, item: typeof mockReference, shouldExist = true, workspace = mockWorkSpaceFolder) => {
        const matches = tree.getReferences(workspace)?.filter(ref => ref.key === item.key);
        const filtered = matches?.filter(ref => ref.path === item.path) || [];
        assert.strictEqual(shouldExist ? 1 : 0, filtered.length || 0);

        return filtered.length > 0 ? filtered[0] : undefined;
    };

    const assertTranslationExists = (tree: RulesetTree, item: typeof mockTranslation, shouldExist = true) => {
        const translation = tree.getTranslation(item.key, mockWorkSpaceFolder);
        assert.strictEqual(translation, shouldExist ? item.value : undefined);
    };

    const addMockDefinition = (tree: RulesetTree, item: typeof mockDefinition, filename = 'dummy.rul', refresh = true) => {
        tree.mergeIntoTree([Object.assign(item)], mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, filename)));
        if (refresh) {
            tree.refresh(mockWorkSpaceFolder);
        }
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

    describe('getDefinitionsByName', () => {
        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

        it('can retrieve a vanilla definition', () => {
            assertDefinitionExists(fixtureRulesetTree, {
                type: 'items',
                name: 'STR_AVALANCHE_LAUNCHER',
                range: [0, 0],
                rangePosition: [[0, 0], [0, 0]],
            }, true, workspaceFolder);
        });

        it('can not retrieve a deleted vanilla definition', () => {
            assertDefinitionExists(fixtureRulesetTree, {
                type: 'items',
                name: 'STR_AVALANCHE_MISSILES',
                range: [0, 0],
                rangePosition: [[0, 0], [0, 0]],
            }, false, workspaceFolder);
        });
    });

    // also tests getDefinitionsByName()
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

    // also tests getReferences()
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

    // todo: mergeVariablesIntoTree()

    // also tests getTranslation()
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

    describe('deleteFileFromTree', () => {
        beforeEach(() => {
            rulesetTree.init();
            addMockDefinition(rulesetTree, mockDefinition, 'dummy.rul');
            addMockReference(rulesetTree, mockReference, 'dummy.rul');
            addMockTranslation(rulesetTree, mockTranslation, 'dummy.rul');
            addMockDefinition(rulesetTree, mockDefinition2, 'dummy2.rul');
            addMockReference(rulesetTree, mockReference2, 'dummy2.rul');
            addMockTranslation(rulesetTree, mockTranslation2, 'dummy2.rul');
        });

        it('removes existing data for file', () => {
            assertDefinitionExists(rulesetTree, mockDefinition);
            assertTranslationExists(rulesetTree, mockTranslation);
            assertReferenceExists(rulesetTree, mockReference);
            rulesetTree.deleteFileFromTree(mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            assertDefinitionExists(rulesetTree, mockDefinition, false);
            assertTranslationExists(rulesetTree, mockTranslation, false);
            assertReferenceExists(rulesetTree, mockReference, false);
        });

        it('does not remove data for unrelated file', () => {
            rulesetTree.deleteFileFromTree(mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            assertDefinitionExists(rulesetTree, mockDefinition2);
            assertTranslationExists(rulesetTree, mockTranslation2);
            assertReferenceExists(rulesetTree, mockReference2);
        });
    });

    describe('getReferences', () => {
        // uses fixtures
        it('can get a key-value reference', () => {
            assertReferenceExists(fixtureRulesetTree, {
                key: 'STR_DUMMY_UNIT1',
                path: 'items.zombieUnitByType.key',
                range: [0, 0],
            }, true, workspaceFolder);

            assertReferenceExists(fixtureRulesetTree, {
                key: 'STR_DUMMY_ZOMBIE_UNIT1',
                path: 'items.zombieUnitByType.value',
                range: [0, 0],
            }, true, workspaceFolder);
        });

        it('can get an array reference', () => {
            assertReferenceExists(fixtureRulesetTree, {
                key: 'STR_DUMMY_AMMO',
                path: 'items.compatibleAmmo',
                range: [0, 0],
            }, true, workspaceFolder);
        });

        it('can get a nested key reference', () => {
            // if (workspaceFolder) {
            //     const refs = fixtureRulesetTree.getReferences(workspaceFolder);
            //     console.log(refs);
            // }

            assertReferenceExists(fixtureRulesetTree, {
                key: 'STR_DUMMY_NESTED_ITEM',
                path: 'manufacture.randomProducedItems[][]',
                range: [0, 0],
            }, true, workspaceFolder);
        });

        it('can get a reference with a comment', () => {
            const reference = assertReferenceExists(fixtureRulesetTree, {
                key: 'STR_COMMENT_TEST',
                path: 'items.type',
                range: [0, 0],
            }, true, workspaceFolder);

            assert.strictEqual('commentTest', reference!.metadata!._comment);
        });
    });

    describe('refresh', () => {
        beforeEach(() => {
            rulesetTree.init();
        });

        it('refreshes the tree state', () => {
            addMockDefinition(rulesetTree, mockDefinition, 'dummy.rul', false);
            assertDefinitionExists(rulesetTree, mockDefinition, false); // should not exist
            rulesetTree.refresh(mockWorkSpaceFolder);
            assertDefinitionExists(rulesetTree, mockDefinition); // now it should
            rulesetTree.deleteFileFromTree(mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            assertDefinitionExists(rulesetTree, mockDefinition); // still
            rulesetTree.refresh(mockWorkSpaceFolder);
            assertDefinitionExists(rulesetTree, mockDefinition, false); // gone
        });
    });

    // todo: getDiagnosticCollection() ?
    // todo: checkDefinitions()
});
