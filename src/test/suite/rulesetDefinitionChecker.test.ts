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

const findDiagnostic = (file: string, expected: string, line?: number, char?: number) => {
    const diagnosticsFile = getDiagnosticsForFile(Uri.file(`${fixturePath}/${file}`));

    if (line && char) {
        return diagnosticsFile.find(item => item.message === expected && item.range.start.line === line && item.range.start.character === char);
    }

    return diagnosticsFile.find(item => item.message === expected);
};

const getNumberOfDiagnostics = () => {
    const diagnostics = rulesetTree.getDiagnosticCollection(workspaceFolder);
    if (!diagnostics) {
        assert.fail('No diagnostics found');
    }

    let number = 0;
    diagnostics.forEach((uri) => {
        number += diagnostics.get(uri)?.length || 0;
    });

    return number;
};

const expectedNumberOfDiagnostics = 55;

const originalSettingFindDuplicateDefinitions = workspace.getConfiguration('oxcYamlHelper').get<boolean>('findDuplicateDefinitions');
const originalSettingValidateCategories = workspace.getConfiguration('oxcYamlHelper').get<string>('validateCategories');

describe('rulesetDefinitionChecker', () => {
    before(async () => {
        return waitForExtensionLoad(rulesetResolver);
    });

    it('finds the expected number of diagnostics', () => {
        assert.strictEqual(getNumberOfDiagnostics(), expectedNumberOfDiagnostics);
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

    after(async () => {
        // fallback in case assert fails
        await workspace.getConfiguration('oxcYamlHelper').update('findDuplicateDefinitions', originalSettingFindDuplicateDefinitions);
    });

    it('does not find a diagnostic for duplicate type if setting is disabled', async () => {
        await workspace.getConfiguration('oxcYamlHelper').update('findDuplicateDefinitions', false);
        // await waitForRefresh(rulesetResolver);

        const diagnostic = findDiagnostic('items.rul', "items STR_DUPLICATE_CHECK is duplicate, also exists in (add # ignoreDuplicate after this to ignore this entry):\n\titems.rul line 40");
        assert.strictEqual(diagnostic, undefined);
        // we should have two less diagnostics now
        assert.strictEqual(getNumberOfDiagnostics(), expectedNumberOfDiagnostics - 2);

        // should do it here too, so it's correct for next test
        await workspace.getConfiguration('oxcYamlHelper').update('findDuplicateDefinitions', originalSettingFindDuplicateDefinitions);
    });

    it('finds a diagnostic for an invalid category', () => {
        const diagnostic = findDiagnostic('items.rul', '"STR_DUMMY_CATEGORY" does not exist (items.categories)');
        assert.notStrictEqual(diagnostic, undefined);
    });

    after(async () => {
        // fallback in case assert fails
        await workspace.getConfiguration('oxcYamlHelper').update('validateCategories', originalSettingValidateCategories);
    });

    it('does not find a diagnostic for an invalid category if setting is disabled', async () => {
        await workspace.getConfiguration('oxcYamlHelper').update('validateCategories', 'no');

        const diagnostic = findDiagnostic('items.rul', '"STR_DUMMY_CATEGORY" does not exist (items.categories)');
        assert.strictEqual(diagnostic, undefined);

        // we should have one less diagnostic now
        assert.strictEqual(getNumberOfDiagnostics(), expectedNumberOfDiagnostics - 1);
        // await waitForValidate(rulesetResolver);

        // should do it here too, so it's correct for next test
        await workspace.getConfiguration('oxcYamlHelper').update('validateCategories', originalSettingValidateCategories);
    });

    it('finds a diagnostic for an invalid globalVariables reference', () => {
        const diagnostic = findDiagnostic('globalVariables.rul', '"STR_DUMMY_NON_EXISTING_RESEARCH" does not exist (globalVariables.newBaseUnlockResearch)');
        assert.notStrictEqual(diagnostic, undefined);
    });

    // logic checks
    it('finds a diagnostic for an incorrect missionZone', () => {
        const diagnostic = findDiagnostic('regions.rul', 'Crossing the prime meridian requires a different syntax (change to [2,361,3,-4] to fix this). See wiki.');
        assert.notStrictEqual(diagnostic, undefined);
    });

    const ufopaediaImageErrorMessage =  'Ufopaedia articles with type_ids 1, 2, 3, 7, 10, 11, 12, 13, 14, 15, 16, 17 must have an image_id. Otherwise this will cause a segmentation fault when opening the article!';
    it('finds a diagnostic for an ufopaedia without image_id', () => {
        const diagnostic = findDiagnostic('ufopaedia.rul', ufopaediaImageErrorMessage, 2, 13);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for an ufopaedia with image_id', () => {
        const diagnostic = findDiagnostic('ufopaedia.rul', ufopaediaImageErrorMessage, 4, 13);
        assert.strictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for an ufopaedia that does not need an image type', () => {
        const diagnostic = findDiagnostic('ufopaedia.rul', ufopaediaImageErrorMessage, 7, 13);
        assert.strictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an ufopaedia without type_id', () => {
        const diagnostic = findDiagnostic('ufopaedia.rul', `'STR_ARTICLE_WITHOUT_TYPE_ID' does not have a type_id: set. Without it, the article will not appear in-game.`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an ufopaedia type_id=1 and no rect_text', () => {
        const diagnostic = findDiagnostic('ufopaedia.rul', `Ufopaedia articles with type_ids 1 (Craft) should have rect_text:. Otherwise the text will not show up in the article.`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for a craftweapon with an incorrect rearmRate', () => {
        const diagnostic = findDiagnostic('craftWeapons.rul', "rearmRate of '10' is less than clipSize '25' for clip 'STR_REARM_RATE_TEST_AMMO'. This will cause a crash on loading OpenXcom!");
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('does not finds a diagnostic for a craftweapon with a correct rearmRate', () => {
        const diagnostic = findDiagnostic('craftWeapons.rul', "rearmRate of '50' is less than clipSize '25' for clip 'STR_REARM_RATE_TEST_AMMO'. This will cause a crash on loading OpenXcom!", 10, 15);
        assert.strictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for a mapscript command with incorrect groups', () => {
        let diagnostic = findDiagnostic('mapScripts.rul', `'Group '10' does not exist in terrain for TEST_BAD_MAPSCRIPT. This will cause a segmentation fault when loading the map!`, 5, 21);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('mapScripts.rul', `'Group '10' does not exist in terrain for TEST_BAD_MAPSCRIPT. This will cause a segmentation fault when loading the map!`, 6, 21);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('mapScripts.rul', `'Group '10' does not exist in terrain for TEST_BAD_MAPSCRIPT. This will cause a segmentation fault when loading the map!`, 7, 15);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('does not find a diagnostic for a mapscript command with correct groups', () => {
        let diagnostic = findDiagnostic('mapScripts.rul', `'Group '2' does not exist in terrain for TEST_GOOD_MAPSCRIPT. This will cause a segmentation fault when loading the map!`, 13, 21);
        assert.strictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('mapScripts.rul', `'Group '2' does not exist in terrain for TEST_GOOD_MAPSCRIPT. This will cause a segmentation fault when loading the map!`, 14, 21);
        assert.strictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('mapScripts.rul', `'Group '2' does not exist in terrain for TEST_GOOD_MAPSCRIPT. This will cause a segmentation fault when loading the map!`, 15, 15);
        assert.strictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an item with confAuto.shots and autoShots', () => {
        const diagnostic = findDiagnostic('items.rul', 'autoShots and confAuto.shots should not both be set!', 90, 15);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an item with duplicate tuXXXX and costXXXX.time', () => {
        let diagnostic = findDiagnostic('items.rul', `costAimed.time and tuAimed should not both be set!`, 93, 13);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `costSnap.time and tuSnap should not both be set!`, 94, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `costAuto.time and tuAuto should not both be set!`, 95, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `costMelee.time and tuMelee should not both be set!`, 96, 13);
        assert.notStrictEqual(diagnostic, undefined);

        diagnostic = findDiagnostic('items.rul', `costAimed.time and tuAimed should not both be set!`, 98, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `costSnap.time and tuSnap should not both be set!`, 100, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `costAuto.time and tuAuto should not both be set!`, 102, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `costMelee.time and tuMelee should not both be set!`, 104, 12);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an item with a tu cost but no accuracy', () => {
        let diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Aimed, there should be an accuracy setting!`, 93, 13);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Snap, there should be an accuracy setting!`, 94, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Auto, there should be an accuracy setting!`, 95, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Melee, there should be an accuracy setting!`, 96, 13);
        assert.notStrictEqual(diagnostic, undefined);

        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Aimed, there should be an accuracy setting!`, 98, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Snap, there should be an accuracy setting!`, 100, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Auto, there should be an accuracy setting!`, 102, 12);
        assert.notStrictEqual(diagnostic, undefined);
        diagnostic = findDiagnostic('items.rul', `if there's a TU cost for Melee, there should be an accuracy setting!`, 104, 12);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for a craftweapon without a launcher', () => {
        const diagnostic = findDiagnostic('craftWeapons.rul', `'STR_NO_LAUNCHER_TEST' does not have a launcher: set. This will cause a crash on loading OpenXcom!`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for a craftweapon with a launcher that is not an item', () => {
        const diagnostic = findDiagnostic('craftWeapons.rul', `'STR_LAUNCHER_WRONG_TYPE_TEST' launcher 'STR_DUMMY_MANUFACTURE': item does not exist. This will cause a crash on loading OpenXcom!`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for a soldierTransformation without allowedSoldierTypes', () => {
        const diagnostic = findDiagnostic('soldierTransformation.rul', `'STR_TRANSFORMATION_WITHOUT_SOLDIER_TYPES' does not have allowedSoldierTypes: set. Without it, it can never be used in-game.`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for alienDeployments without data', () => {
        const diagnostic = findDiagnostic('alienDeployments.rul', `'STR_TEST_ALIEN_DEPLOYMENT_NO_DATA' does not have data: set. This can lead to crashes in-game.`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds diagnostics for an alienDeployments with missing data', () => {
        const expected = [
            {line: 5, char: 19, missing: ['lowQty', 'highQty'/*, 'percentageOutsideUfo'*/]},
            {line: 11, char: 19, missing: ['lowQty', 'highQty'/*, 'percentageOutsideUfo'*/, 'itemSets']}
        ];

        for (const entry of expected) {
            for (const key of entry.missing) {
                const diagnostic = findDiagnostic('alienDeployments.rul', `data entry '${key}' not set. This can lead to crashes in-game.`, entry.line, entry.char);
                assert.notStrictEqual(diagnostic, undefined);
            }
        }
    });

    it('finds a diagnostic for a manufactureShortcut without startFrom', () => {
        const diagnostic = findDiagnostic('manufactureShortcut.rul', `'STR_MANUFACTURE_SHORTCUT_WITHOUT_STARTFROM' does not have startFrom: set. This will cause a segmentation fault on loading OpenXcom!`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an alienMission without waves', () => {
        const diagnostic = findDiagnostic('alienMissions.rul', `'STR_ALIEN_MISSION_WITHOUT_WAVES' does not have waves: set. This will lead to a segmentation fault when this mission triggers.`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an alienMission without raceWeights', () => {
        const diagnostic = findDiagnostic('alienMissions.rul', `'STR_ALIEN_MISSION_WITHOUT_RACEWEIGHTS' does not have raceWeights: set here or in missionScripts. This will lead to a crash when this mission triggers.`, 3, 10);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an alienMission without raceWeights in missionScripts', () => {
        const diagnostic = findDiagnostic('alienMissions.rul', `'STR_ALIEN_MISSION_IN_MISSIONSCRIPT_NO_RACEWEIGHTS' does not have raceWeights: set here or in missionScripts. This will lead to a crash when this mission triggers.`, 14, 10);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an alienMission with a wave without a trajectory', () => {
        const diagnostic = findDiagnostic('alienMissions.rul', `Wave does not have trajectory: set. This will cause a crash on loading OpenXcom!`);
        assert.notStrictEqual(diagnostic, undefined);
    });

    it('finds a diagnostic for an alienMission.raceWeights with invalid race', () => {
        const diagnostic = findDiagnostic('alienMissions.rul', `"STR_DUMMY_RACE" does not exist (alienMissions.raceWeights.0)`);
        assert.notStrictEqual(diagnostic, undefined);
    });
});
