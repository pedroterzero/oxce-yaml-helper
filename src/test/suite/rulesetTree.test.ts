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
        index: 0,
    };

    const mockDefinition = {
        type: 'items',
        name: 'STR_MOCK_ITEM1',
        range: [0, 0],
        rangePosition: [
            [0, 0],
            [0, 0],
        ],
    };

    const mockDefinition2 = {
        type: 'items',
        name: 'STR_MOCK_ITEM2',
        range: [0, 0],
        rangePosition: [
            [0, 0],
            [0, 0],
        ],
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
        value: 'Mock Item',
    };

    const mockTranslation2 = {
        language: 'en-US',
        key: 'STR_MOCK_ITEM2',
        value: 'Mock Item 2',
    };

    const assertDefinitionExists = (
        tree: RulesetTree,
        item: typeof mockDefinition,
        shouldExist = true,
        workspace = mockWorkSpaceFolder,
    ) => {
        const matches = tree.getDefinitionsByName(item.name, workspace, undefined);
        assert.strictEqual(matches?.length, shouldExist ? 1 : 0);
        if (shouldExist) {
            assert.notStrictEqual(
                matches.find((match) => match.type === item.type),
                undefined,
            );
        }
    };

    const assertReferenceExists = (
        tree: RulesetTree,
        item: typeof mockReference,
        shouldExist = true,
        workspace = mockWorkSpaceFolder,
    ) => {
        const matches = tree.getReferences(workspace)?.filter((ref) => ref.key === item.key);
        const filtered = matches?.filter((ref) => ref.path === item.path) || [];
        assert.strictEqual(shouldExist ? 1 : 0, filtered.length || 0);

        return filtered.length > 0 ? filtered[0] : undefined;
    };

    const assertTranslationExists = (tree: RulesetTree, item: typeof mockTranslation, shouldExist = true) => {
        const translation = tree.getTranslation(item.key, mockWorkSpaceFolder);
        assert.strictEqual(translation, shouldExist ? item.value : undefined);
    };

    const addMockDefinition = (
        tree: RulesetTree,
        item: typeof mockDefinition,
        filename = 'dummy.rul',
        refresh = true,
    ) => {
        tree.mergeIntoTree([Object.assign(item)], mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, filename)));
        if (refresh) {
            tree.refresh(mockWorkSpaceFolder);
        }
    };

    const addMockReference = (tree: RulesetTree, item: typeof mockReference, filename = 'dummy.rul') => {
        tree.mergeReferencesIntoTree(
            [Object.assign(item)],
            mockWorkSpaceFolder,
            Uri.file(path.resolve(fixturePath, filename)),
        );
        tree.refresh(mockWorkSpaceFolder);
    };

    const addMockTranslation = (tree: RulesetTree, item: typeof mockTranslation, filename = 'dummy.rul') => {
        tree.mergeTranslationsIntoTree(
            [Object.assign(item)],
            mockWorkSpaceFolder,
            Uri.file(path.resolve(fixturePath, filename)),
        );
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
            assertDefinitionExists(
                fixtureRulesetTree,
                {
                    type: 'items',
                    name: 'STR_AVALANCHE_LAUNCHER',
                    range: [0, 0],
                    rangePosition: [
                        [0, 0],
                        [0, 0],
                    ],
                },
                true,
                workspaceFolder,
            );
        });

        it('can not retrieve a deleted vanilla definition', () => {
            assertDefinitionExists(
                fixtureRulesetTree,
                {
                    type: 'items',
                    name: 'STR_AVALANCHE_MISSILES',
                    range: [0, 0],
                    rangePosition: [
                        [0, 0],
                        [0, 0],
                    ],
                },
                false,
                workspaceFolder,
            );
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
            assertReferenceExists(
                fixtureRulesetTree,
                {
                    key: 'STR_DUMMY_UNIT1',
                    path: 'items.zombieUnitByType.key',
                    range: [0, 0],
                },
                true,
                workspaceFolder,
            );

            assertReferenceExists(
                fixtureRulesetTree,
                {
                    key: 'STR_DUMMY_ZOMBIE_UNIT1',
                    path: 'items.zombieUnitByType.value',
                    range: [0, 0],
                },
                true,
                workspaceFolder,
            );
        });

        it('can get an array reference', () => {
            assertReferenceExists(
                fixtureRulesetTree,
                {
                    key: 'STR_DUMMY_AMMO',
                    path: 'items.compatibleAmmo[]',
                    range: [0, 0],
                },
                true,
                workspaceFolder,
            );
        });

        it('can get a nested key reference', () => {
            // if (workspaceFolder) {
            //     const refs = fixtureRulesetTree.getReferences(workspaceFolder);
            //     console.log(refs);
            // }

            assertReferenceExists(
                fixtureRulesetTree,
                {
                    key: 'STR_DUMMY_NESTED_ITEM',
                    path: 'manufacture.randomProducedItems[][]',
                    range: [0, 0],
                },
                true,
                workspaceFolder,
            );
        });

        it('can get a reference with a comment', () => {
            const reference = assertReferenceExists(
                fixtureRulesetTree,
                {
                    key: 'STR_COMMENT_TEST',
                    path: 'items.type',
                    range: [0, 0],
                },
                true,
                workspaceFolder,
            );

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

    describe('mergeVariablesIntoTree', () => {
        beforeEach(() => {
            rulesetTree.init();
        });

        it('stores and retrieves variables', () => {
            const variables = { 'testVar': 'testValue', 'testVar2': 42 };
            rulesetTree.mergeVariablesIntoTree(variables, mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            const retrieved = rulesetTree.getVariables(mockWorkSpaceFolder);
            assert.notStrictEqual(retrieved, undefined);
            assert.strictEqual(retrieved!['testVar'], 'testValue');
            assert.strictEqual(retrieved!['testVar2'], 42);
        });

        it('overwrites variables from same file', () => {
            const variables1 = { 'testVar': 'value1' };
            const variables2 = { 'testVar': 'value2' };
            rulesetTree.mergeVariablesIntoTree(variables1, mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            rulesetTree.mergeVariablesIntoTree(variables2, mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            const retrieved = rulesetTree.getVariables(mockWorkSpaceFolder);
            assert.strictEqual(retrieved!['testVar'], 'value2');
        });

        it('does not overwrite variables from different files', () => {
            const variables1 = { 'testVar1': 'value1' };
            const variables2 = { 'testVar2': 'value2' };
            rulesetTree.mergeVariablesIntoTree(variables1, mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.mergeVariablesIntoTree(variables2, mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy2.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            const retrieved = rulesetTree.getVariables(mockWorkSpaceFolder);
            assert.strictEqual(retrieved!['testVar1'], 'value1');
            assert.strictEqual(retrieved!['testVar2'], 'value2');
        });
    });

    describe('getDefinitionsByName with ruleType filter', () => {
        beforeEach(() => {
            rulesetTree.init();
        });

        it('returns definitions matching the correct type', () => {
            addMockDefinition(rulesetTree, mockDefinition); // type: 'items'
            const matches = rulesetTree.getDefinitionsByName(mockDefinition.name, mockWorkSpaceFolder, { type: 'items', key: '' });
            assert.strictEqual(matches?.length, 1);
        });

        it('returns definitions when no ruleType filter is given', () => {
            addMockDefinition(rulesetTree, mockDefinition);
            const matches = rulesetTree.getDefinitionsByName(mockDefinition.name, mockWorkSpaceFolder, undefined);
            assert.strictEqual(matches?.length, 1);
        });

        it('handles multiple definitions with the same name across different types', () => {
            const itemDef = { ...mockDefinition, type: 'items', name: 'STR_SHARED_NAME' };
            const craftDef = { ...mockDefinition, type: 'crafts', name: 'STR_SHARED_NAME' };
            addMockDefinition(rulesetTree, itemDef, 'items.rul');
            addMockDefinition(rulesetTree, craftDef, 'crafts.rul');
            const matches = rulesetTree.getDefinitionsByName('STR_SHARED_NAME', mockWorkSpaceFolder, undefined);
            assert.strictEqual(matches?.length, 2);
        });
    });

    describe('deleteFileFromTree - edge cases', () => {
        beforeEach(() => {
            rulesetTree.init();
        });

        it('handles deleting a file that was never added', () => {
            addMockDefinition(rulesetTree, mockDefinition, 'dummy.rul');
            rulesetTree.deleteFileFromTree(mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'nonexistent.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);
            // the original definition should still exist
            assertDefinitionExists(rulesetTree, mockDefinition);
        });

        it('cleans up all data types for a deleted file', () => {
            const file = Uri.file(path.resolve(fixturePath, 'cleanup.rul'));
            rulesetTree.mergeIntoTree([Object.assign({}, mockDefinition) as any], mockWorkSpaceFolder, file);
            rulesetTree.mergeReferencesIntoTree([Object.assign({}, mockReference) as any], mockWorkSpaceFolder, file);
            rulesetTree.mergeTranslationsIntoTree([Object.assign({}, mockTranslation)], mockWorkSpaceFolder, file);
            rulesetTree.mergeVariablesIntoTree({ 'cleanupVar': 'value' }, mockWorkSpaceFolder, file);
            rulesetTree.refresh(mockWorkSpaceFolder);

            assertDefinitionExists(rulesetTree, mockDefinition);
            assertTranslationExists(rulesetTree, mockTranslation);
            assertReferenceExists(rulesetTree, mockReference);

            rulesetTree.deleteFileFromTree(mockWorkSpaceFolder, file);
            rulesetTree.refresh(mockWorkSpaceFolder);

            assertDefinitionExists(rulesetTree, mockDefinition, false);
            assertTranslationExists(rulesetTree, mockTranslation, false);
            assertReferenceExists(rulesetTree, mockReference, false);
        });
    });

    describe('init resets all state', () => {
        it('clears definitions, references, translations, and variables', () => {
            rulesetTree.init();
            addMockDefinition(rulesetTree, mockDefinition);
            addMockReference(rulesetTree, mockReference);
            addMockTranslation(rulesetTree, mockTranslation);
            rulesetTree.mergeVariablesIntoTree({ 'initVar': 'val' }, mockWorkSpaceFolder, Uri.file(path.resolve(fixturePath, 'dummy.rul')));
            rulesetTree.refresh(mockWorkSpaceFolder);

            assertDefinitionExists(rulesetTree, mockDefinition);
            assertTranslationExists(rulesetTree, mockTranslation);
            assertReferenceExists(rulesetTree, mockReference);

            rulesetTree.init();

            const matches = rulesetTree.getDefinitionsByName(mockDefinition.name, mockWorkSpaceFolder, undefined);
            assert.strictEqual(matches?.length, 0);
            const translation = rulesetTree.getTranslation(mockTranslation.key, mockWorkSpaceFolder);
            assert.strictEqual(translation, undefined);
        });
    });

    describe('getTranslation', () => {
        it('returns undefined for non-existing translation key', () => {
            const translation = fixtureRulesetTree.getTranslation('STR_THIS_KEY_DOES_NOT_EXIST', workspaceFolder!);
            assert.strictEqual(translation, undefined);
        });

        it('retrieves an existing translation from fixtures', () => {
            const translation = fixtureRulesetTree.getTranslation('STR_DUMMY_ITEM', workspaceFolder!);
            assert.strictEqual(translation, 'Dummy');
        });
    });

    describe('getNumberOfParsedDefinitionFiles', () => {
        it('returns a positive number for loaded fixtures', () => {
            const count = fixtureRulesetTree.getNumberOfParsedDefinitionFiles(workspaceFolder!);
            assert.ok(count !== undefined && count > 0, 'Should have parsed at least one file');
        });

        it('returns zero for a fresh tree', () => {
            rulesetTree.init();
            const count = rulesetTree.getNumberOfParsedDefinitionFiles(mockWorkSpaceFolder);
            // a fresh workspace folder may return 0 or undefined
            assert.ok(count === undefined || count === 0, 'Fresh tree should have no parsed files');
        });
    });
});
