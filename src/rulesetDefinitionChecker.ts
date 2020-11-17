import { Diagnostic, DiagnosticSeverity, Range, TextDocument, workspace } from "vscode";
import { rulesetParser } from "./rulesetParser";
import { Match } from "./rulesetTree";
import { ReferenceFile, TypeLookup } from "./workspaceFolderRuleset";

export class RulesetDefinitionChecker {
    private builtinBackgrounds = [
        'BACK01.SCR', 'BACK02.SCR', 'BACK03.SCR', 'BACK04.SCR', 'BACK05.SCR',
        'BACK06.SCR', 'BACK07.SCR', 'BACK08.SCR', 'BACK09.SCR', 'BACK10.SCR',
        'BACK11.SCR', 'BACK12.SCR', 'BACK13.SCR', 'BACK14.SCR', 'BACK15.SCR',
        'BACK16.SCR', 'BACK17.SCR',
    ];

    private builtinUfopaediaImages = [
        'UP001.SPK', 'UP002.SPK', 'UP003.SPK', 'UP004.SPK', 'UP005.SPK',
        'UP006.SPK', 'UP007.SPK', 'UP008.SPK', 'UP009.SPK', 'UP010.SPK',
        'UP011.SPK', 'UP012.SPK', 'UP013.SPK', 'UP014.SPK', 'UP015.SPK',
        'UP016.SPK', 'UP017.SPK', 'UP018.SPK', 'UP019.SPK', 'UP020.SPK',
        'UP021.SPK', 'UP022.SPK', 'UP023.SPK', 'UP024.SPK', 'UP025.SPK',
        'UP026.SPK', 'UP027.SPK', 'UP028.SPK', 'UP029.SPK', 'UP030.SPK',
        'UP031.SPK', 'UP032.SPK', 'UP033.SPK', 'UP034.SPK', 'UP035.SPK',
        'UP036.SPK', 'UP037.SPK', 'UP038.SPK', 'UP039.SPK', 'UP040.SPK',
        'UP041.SPK', 'UP042.SPK',
    ];

    private builtinArmorSprites = [
        'MAN_0F0', 'MAN_0F1', 'MAN_0F2', 'MAN_0F3', 'MAN_0M0',
        'MAN_0M1', 'MAN_0M2', 'MAN_0M3', 'MAN_1F0', 'MAN_1F1',
        'MAN_1F2', 'MAN_1F3', 'MAN_1M0', 'MAN_1M1', 'MAN_1M2',
        'MAN_1M3', 'MAN_2', 'MAN_3'
    ];

    private builtinTypes: {[key: string]: string[]} = {
        'alienDeployments.alertBackground': this.builtinBackgrounds,
        'alienDeployments.briefing.background': this.builtinBackgrounds,
        'alienDeployments.extendedObjectiveType': ['STR_EVACUATION', 'STR_FRIENDLY_VIP', 'STR_ITEM_EXTRACTION'], // FtA
        'alienMissions.waves[].ufo': ['dummy'],
        'armors.spriteInv': this.builtinArmorSprites,
        'armors.spriteSheet': ['CHRYS.PCK', 'XCOM_1.PCK', 'XCOM_2.PCK', 'ZOMBIE.PCK'],
        'armors.storeItem': ['STR_NONE'],
        'enviroEffects.paletteTransformations.PAL_BATTLESCAPE': ['PAL_BATTLESCAPE_1', 'PAL_BATTLESCAPE_2', 'PAL_BATTLESCAPE_3'],
        'interfaces.backgroundImage': this.builtinBackgrounds,
        'manufacture.category': [
            'STR_AMMUNITION', 'STR_CRAFT', 'STR_CRAFT_AMMUNITION', 'STR_CRAFT_WEAPON',
            'STR_EQUIPMENT', 'STR_WEAPON'
        ],
        'units.rank': [
            'STR_LIVE_COMMANDER', 'STR_LIVE_ENGINEER', 'STR_LIVE_LEADER', 'STR_LIVE_MEDIC',
            'STR_LIVE_NAVIGATOR', 'STR_LIVE_SOLDIER', 'STR_LIVE_TERRORIST',

            'STR_CIVILIAN' /* OXCE */
        ],
        'ufos.size': ['STR_LARGE', 'STR_MEDIUM_UC', 'STR_SMALL', 'STR_VERY_LARGE', 'STR_VERY_SMALL'],
        'units.civilianRecoveryType': ['STR_ENGINEER', 'STR_SCIENTIST'],
        'ufopaedia.image_id': this.builtinUfopaediaImages,
    };

    private soundIds = [-1, 54];
    private smokeIds = [-1, 55];
    private bigSpriteIds = [-1, 56];
    private floorSpriteIds = [-1, 72];
    private handSpriteIds = [-1, 127];

    private builtinResourceIds: {[key: string]: number[]} = {
        'items.bigSprite': this.bigSpriteIds,
        'items.fireSound': this.soundIds,
        'items.floorSprite': this.floorSpriteIds,
        'items.handSprite': this.handSpriteIds,
        'items.hitAnimation': this.smokeIds,
        'items.hitSound': this.soundIds,
        'items.meleeSound': this.soundIds,
        'items.meleeHitSound': this.soundIds,
        'units.deathSound': this.soundIds,
        'units.moveSound': this.soundIds,
    };

    private typeLinks: {[key: string]: string[]} = {
        'startingBase.facilities': ['facilities'], // TODO: FIX THIS%
        'startingBase.randomSoldiers': ['soldiers'], // TODO: FIX THIS%
        'startingBase.items': ['items'], // TODO: FIX THIS%
        //'startingBase.crafts': ['crafts'], crafts to crafts and also weapons to craftWeapons
        'facilities.requires': ['research'],
        'facilities.mapName': ['terrains.mapBlocks'], // TODO: FIX THIS%
        'facilities.destroyedFacility': ['facilities'],
        'facilities.buildCostItems': ['items'], // TODO: FIX THIS%
        'facilities.buildOverFacilities': ['facilities'],
        'armors.corpseBattle': ['items'],
        'items.categories': ['itemCategories']
    };

    private ignoreTypes = [
        'armors.layersDefaultPrefix',
        'armors.spriteInv', // TODO: FIX THIS%
        'alienDeployments.terrains', // may want to check that the files exist
        'alienDeployments.briefing.music', // not sure about this one (check that files exist? stock?)
        'battleScripts.commands[].spawnBlocks', // FtA
        'covertOperations.specialRule', // FtA
        'crafts.battlescapeTerrainData.mapBlocks[].name', // may want to check that the files exist
        'crafts.battlescapeTerrainData.mapDataSets', // may want to check that the files exist
        'crafts.battlescapeTerrainData.name', // may want to check that the files exist
        'cutscenes.videos', // may want to check that the files exist
        'cutscenes.slideshow.slides[].imagePath', // may want to check that the files exist
        'extraSprites.fileSingle', // may want to check that the files exist
        'facilities.mapName', // may want to check that the files exist
        'interfaces.elements[].id', // could type check this, but the validator probably catches these
        'interfaces.palette', // could type check this, but the validator probably catches these
        'mapScripts.commands[].direction',
        'mapScripts.commands[].verticalLevels[].terrain', // may want to check that the files exist
        'soldiers.soldierNames', // may want to check that the files exist
        'terrains.mapBlocks[].name', // check that the mapblock files exist
        'terrains.mapDataSets', // check that the terrains exist
        'ufos.battlescapeTerrainData.mapBlocks[].name', // may want to check that the files exist
        'ufos.battlescapeTerrainData.mapDataSets', // may want to check that the files exist
        'ufos.battlescapeTerrainData.name', // may want to check that the files exist
        'units.race', // optional according to Finnik
        // 'units.civilianRecoveryType', // ruleset validator will catch it
        'units.specialObjectiveType', // FtA, ruleset validator will catch it
    ];

    // if we want to check that translations exist
    private stringTypes = [
        'alienDeployments.alert',
        'alienDeployments.alertDescription',
        'alienDeployments.markerName',
        'alienDeployments.briefing.desc',
        'covertOperations.description', // FtA
        'covertOperations.successDescription', // FtA
        'crafts.weaponStrings',
        'cutscenes.slideshow.slides[].caption',
        'diplomacyFactions.description', // FtA
        'events.description', // FtA
        'items.confAimed.name',
        'items.confAuto.name',
        'items.confMelee.name',
        'items.confSnap.name',
        'items.medikitActionName',
        'items.unprimeActionName',
        'regions.missionZones[][]',
        'soldiers.rankStrings',
        'ufopaedia.section', // should probably check that the string exists
        'ufopaedia.text',
        'ufopaedia.pages[].text',
        'ufopaedia.pages[].title',
        // not sure
        // 'items.categories',
        // 'manufacture.category',
    ];

    public checkFile(file: ReferenceFile, lookup: TypeLookup): Diagnostic[] {
        const doc = workspace.textDocuments.find(doc => doc.uri.path === file.file.path);
        if (!doc) {
            return [];
        }

        const diagnostics : Diagnostic[] = [];
        for (const ref of file.references) {
            if (!this.typeExists(ref)) {
                continue;
            }

            const possibleKeys = this.getPossibleKeys(ref);
            if (possibleKeys.filter(key => key in lookup).length === 0) {
                this.addDiagnostic(doc, ref, diagnostics);
            } else {
                const add = this.checkForCorrectTarget(ref, possibleKeys, lookup);

                if (add) {
                    this.addDiagnostic(doc, ref, diagnostics);
                }
            }
        }

        return diagnostics;
    }

    private getPossibleKeys(ref: Match) {
        const possibleKeys = [ref.key];

        if (ref.path === 'armors.spriteInv') {
            possibleKeys.push(ref.key + '.SPK');
        }

        return possibleKeys;
    }

    /**
     * If we found a match, check that the definition found is a valid target for the reference
     * @param ref
     * @param possibleKeys
     * @param lookup
     */
    private checkForCorrectTarget(ref: Match, possibleKeys: string[], lookup: TypeLookup) {
        let add = false;
        if (ref.path in this.typeLinks) {
            add = true;
            for (const key of possibleKeys) {
                if (key in lookup) {
                    for (const result of lookup[key]) {
                        if (this.typeLinks[ref.path].indexOf(result.type) !== -1) {
                            add = false;
                        }
                    }
                }
            }
        }
        return add;
    }

    private addDiagnostic(doc: TextDocument, ref: Match, diagnostics: Diagnostic[]) {
        const myRange = rulesetParser.fixRangesForWindowsLineEndingsIfNeeded(doc, ref.range);
        const range = new Range(doc.positionAt(myRange[0]), doc.positionAt(myRange[1]));

        // const text = doc.getText(range);
        // if (text.trim().length < text.length) {
        //     // deal with trailing whitespace/CRLF
        //     range = new Range(doc.positionAt(ref.range[0]), doc.positionAt(ref.range[1] - (text.length - text.trim().length)));
        // }
        diagnostics.push(new Diagnostic(range, `"${ref.key}" does not exist (${ref.path})`, DiagnosticSeverity.Warning));
    }

    private typeExists(ref: Match): boolean {
        if (ref.path.match(/^[a-z]+\.delete$/i)) {
            // don't care about the delete keys
            // HANDLE delete!
            return false;
        }
        if (ref.path.indexOf('extraStrings.') === 0) {
            // ignore extraStrings for now(?)
            return false;
        }
        if (this.ignoreTypes.indexOf(ref.path) !== -1) {
            // ignore these assorted types for now
            return false;
        }
        if (this.stringTypes.indexOf(ref.path) !== -1) {
            // ignore extraStrings for now
            return false;
        }
        if (ref.path in this.builtinTypes && this.builtinTypes[ref.path].indexOf(ref.key) !== -1) {
            // built in types
            return false;
        }

        if (ref.path in this.builtinResourceIds) {
            const [min, max] = this.builtinResourceIds[ref.path];

            if (parseInt(ref.key) >= min && parseInt(ref.key) <= max) {
              // built in resource id
              return false;
            }
        }

        return true;
    }

}

export const rulesetDefinitionChecker = new RulesetDefinitionChecker();
