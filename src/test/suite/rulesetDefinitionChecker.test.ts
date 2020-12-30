import * as assert from 'assert';
import { resolve } from 'path';
import { Uri, workspace } from 'vscode';
import { rulesetResolver } from '../../extension';
import { rulesetTree } from '../../rulesetTree';
import { waitForExtensionLoad } from './tools';

const fixturePath = resolve(__dirname, '../../../src/test/suite/fixtures');
const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(fixturePath));

if (!workspaceFolder) {
    throw new Error('Should not happen');
}

const getDiagnosticsForFile = (uri: Uri) => {
    const diagnostics = rulesetTree.getDiagnosticCollection(workspaceFolder);
    if (!diagnostics) {
        assert.fail('No diagnostics found');
    }

    const diagnosticsFile = diagnostics.get(uri);
    if (!diagnosticsFile) {
        assert.fail(`No diagnostics found for ${uri.path}`);
    }
    return diagnosticsFile;
};

const findDiagnostic = (file: string, expected: string) => {
    const diagnosticsFile = getDiagnosticsForFile(Uri.file(`${fixturePath}/${file}`));

    return diagnosticsFile.find(item => item.message === expected);
};

describe('rulesetDefinitionChecker', () => {
    before(async () => {
        return waitForExtensionLoad(rulesetResolver);
    });

    it('finds a diagnostic for non existing item', () => {
        const diagnostic = findDiagnostic('items.rul', '"STR_DUMMY_AMMO" does not exist (items.compatibleAmmo)');
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for non existing builtin-type', () => {
        const diagnostic = findDiagnostic('globalVariables.rul', '"STR_DUMMY_STATUS" does not exist (startingBase.crafts[].status) for STR_DUMMY_CRAFT');
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for existing builtin-type (int)', () => {
        const diagnostic = findDiagnostic('items.rul', '"3" does not exist (items.meleeAnimation) for STR_BUILTIN_TYPE_TEST');
        assert.strictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for existing builtin-type (string)', () => {
        const diagnostic = findDiagnostic('units.rul', '"STR_LIVE_COMMANDER" does not exist (units.rank) for STR_DUMMY_UNIT2');
        assert.strictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for existing builtin-type regex', () => {
        const diagnostic = findDiagnostic('globalVariables.rul', '"STR_READY" does not exist (startingBase.crafts[].status) for STR_DUMMY_CRAFT');
        assert.strictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for string type', () => {
        const diagnostic = findDiagnostic('items.rul', '"STR_DUMMY_STRING_TYPE" does not exist (items.name) for STR_STRING_TYPE_TEST');
        assert.strictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for duplicate type', () => {
        const diagnostic = findDiagnostic('items.rul', "items STR_DUPLICATE_CHECK is duplicate, also exists in (add # ignoreDuplicate after this to ignore this entry):\n\titems.rul line 40");
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('does not finds a diagnostic for ignored duplicate type', () => {
        const diagnostic = findDiagnostic('items.rul', "items STR_DUPLICATE_IGNORE_CHECK is duplicate, also exists in (add # ignoreDuplicate after this to ignore this entry):\n\titems.rul line 48");
        assert.strictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for duplicate type if setting is disabled', async () => {
        const originalSetting = workspace.getConfiguration('oxcYamlHelper').get<boolean>('findDuplicateDefinitions');

        await workspace.getConfiguration('oxcYamlHelper').update('findDuplicateDefinitions', false);
        // await waitForRefresh(rulesetResolver);

        const diagnostic = findDiagnostic('items.rul', "items STR_DUPLICATE_CHECK is duplicate, also exists in (add # ignoreDuplicate after this to ignore this entry):\n\titems.rul line 40");
        assert.strictEqual(diagnostic, undefined);

        await workspace.getConfiguration('oxcYamlHelper').update('findDuplicateDefinitions', originalSetting);
    });

    it('finds a diagnostic for an invalid category', () => {
        const diagnostic = findDiagnostic('items.rul', '"STR_DUMMY_CATEGORY" does not exist (items.categories)');
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for an invalid category if setting is disabled', async () => {
        const originalSetting = workspace.getConfiguration('oxcYamlHelper').get<string>('validateCategories');

        await workspace.getConfiguration('oxcYamlHelper').update('validateCategories', 'no');

        const diagnostic = findDiagnostic('items.rul', '"STR_DUMMY_CATEGORY" does not exist (items.categories)');
        assert.strictEqual(diagnostic, undefined);

        await workspace.getConfiguration('oxcYamlHelper').update('validateCategories', originalSetting);
        // await waitForValidate(rulesetResolver);
    });

    it('finds a diagnostic for an incorrect missionZone', () => {
        const diagnostic = findDiagnostic('regions.rul', 'Crossing the prime meridian requires a different syntax (change to [2,361,3,-4] to fix this). See wiki.');
        assert.notStrictEqual(diagnostic, undefined);
    });
});
