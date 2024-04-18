import { typedProperties } from '../typedProperties';
import { getAdditionalIgnoreTypes } from '../utilities';

/**
 * Prevent the following types being checked as references
 *
 * ATTENTION: a lot of these are in here not because they have unknowable values, but because the json schema validator is already catching them
 */
export const ignoreTypes = [
    // @TODO: actually improve the refNode in the recursive retriever not to process these types?
    '/^[a-zA-Z0-9]\\.refNode\\.',
    'armors.layersDefaultPrefix',
    'armors.scripts.damageSpecialUnit',
    'armors.scripts.damageUnit',
    'armors.scripts.hitUnit',
    'armors.scripts.newTurnUnit',
    'armors.scripts.recolorUnitSprite',
    'armors.scripts.returnFromMissionUnit',
    'armors.scripts.selectUnitSprite',
    'armors.scripts.tryPsiAttackUnit',
    '/^armors\\.layersSpecificPrefix\\.\\d+$/',
    'alienDeployments.music', // not sure about this one (check that files exist? stock? GMTACTIC6?)
    'crafts.battlescapeTerrainData.mapBlocks[].name', // may want to check that the files exist
    'crafts.battlescapeTerrainData.mapDataSets[]', // may want to check that the files exist
    'crafts.battlescapeTerrainData.name', // may want to check that the files exist
    'cutscenes.videos[]', // may want to check that the files exist
    'cutscenes.slideshow.slides[].imagePath', // may want to check that the files exist
    'customPalettes.file', // may want to check that the files exist
    // 'extended.scripts',
    // 'extended.tags.BattleItem',
    // 'extended.tags.BattleUnit',
    // 'extended.tags.RuleArmor',
    // 'extended.tags.RuleItem',
    // 'extended.tags.RuleSoldierBonus',
    'extended.tagsFile', // may want to check that the files exist
    '/^extraSounds\\.(BATTLE|GEO|)\\.CAT\\.files\\.\\d+/', // may want to check that the files exist
    'extraSprites.fileSingle', // may want to check that the files exist
    'extraStrings',
    // TODO CHECK THIS (this was not here, then it was extraSprites.files.0, then regexed)
    '/^extraSprites\\.((BASEBITS|BIGOBS|FLOOROB|HANDOB|INTICON|HIT|SMOKE|X1)\\.PCK|Projectiles|SPICONS\\.DAT)\\.files\\.\\d+/', // may want to check that the files exist
    // 'extraSounds.BATTLE.CAT.files': { recurse: false },
    // 'extraSounds.GEO.CAT.files': { recurse: false },
    '/^extraSprites\\.files\\.\\d+/', // may want to check that the files exist
    // 'facilities.mapName', // may want to check that the files exist
    'interfaces.elements[].id', // could type check this, but the validator probably catches these
    'interfaces.palette', // could type check this, but the validator probably catches these
    'items.accuracyMultiplier',
    'items.scripts.createItem',
    'items.scripts.inventorySpriteOverlay[].code',
    'items.scripts.inventorySpriteOverlay[].new',
    'items.scripts.inventorySpriteOverlay[].offset',
    'items.scripts.newTurnItem',
    'items.scripts.reactionWeaponAction',
    'items.scripts.recolorItemSprite',
    'items.scripts.selectItemSprite',
    'globalVariables.fontName', // may want to check that the files exist
    'globe.data', // may want to check that the files exist
    'mapScripts.commands[].type',
    'mapScripts.commands[].direction',
    'mapScripts.commands[].tunnelData.MCDReplacements[].type',
    'mapScripts.commands[].verticalLevels[].type', // validator should get it
    'missionScripts.varName', // seems it can be ignored (according to Finnik)
    'soldiers.soldierNames[]', // may want to check that the files exist
    // 'terrains.mapBlocks[].name', // check that the mapblock files exist
    'terrains.mapDataSets[]', // check that the terrains exist
    'ufos.battlescapeTerrainData.mapBlocks[].name', // may want to check that the files exist
    'ufos.battlescapeTerrainData.mapDataSets[]', // may want to check that the files exist
    'ufos.battlescapeTerrainData.name', // may want to check that the files exist
    'ufos.scripts.detectUfoFromBase',
    'ufos.scripts.detectUfoFromCraft',
    'units.race', // optional according to Finnik
    // 'units.civilianRecoveryType', // ruleset validator will catch it
    // references to parent mod resources -- @TODO: one day(?) validate that the parent mod actually exists?
    'armors.annoyedFemale[].mod',
    'armors.annoyedMale[].mod',
    'armors.customArmorPreviewIndex.mod',
    'armors.customArmorPreviewIndex[].mod',
    'armors.deathFemale[].mod',
    'armors.deathMale[].mod',
    'armors.moveSound.mod',
    'armors.selectUnitFemale[].mod',
    'armors.selectUnitMale[].mod',
    'armors.selectWeaponFemale[].mod',
    'armors.selectWeaponMale[].mod',
    'armors.startMovingFemale[].mod',
    'armors.startMovingMale[].mod',
    'crafts.selectSound[].mod',
    'crafts.takeoffSound.mod',
    'facilities.spriteShape.mod',
    'items.bulletSprite.mod',
    'items.bigSprite.mod',
    'items.customItemPreviewIndex.mod',
    'items.explosionHitSound.mod',
    'items.explosionHitSound[].mod',
    'items.fireSound.mod',
    'items.fireSound[].mod',
    'items.floorSprite.mod',
    'items.handSprite.mod',
    'items.hitAnimation.mod',
    'items.hitSound.mod',
    'items.meleeAnimation.mod',
    'items.meleeHitSound.mod',
    'items.meleeMissAnimation.mod',
    'items.meleeSound.mod',
    'items.psiSound.mod',
    'items.psiMissSound.mod',
    'items.specialIconSprite.mod',
    'items.vaporColorSurface.mod',
    'units.deathSound.mod',
    'units.deathSound[].mod',
    'units.aggroSound.mod',
    'units.moveSound.mod',
    'selectBaseSound.mod',
    'soldiers.deathFemale[].mod',
    'soldiers.deathMale[].mod',
    'soldiers.rankSprite.mod',
    'soldiers.rankBattleSprite.mod',
    'soldiers.rankTinySprite.mod',
    'startDogfightSound.mod',
    'operationNamesFirst',
    'operationNamesLast',
    'baseNamesFirst',
    'baseNamesLast',
].concat(typedProperties.getStoreVariables(), getAdditionalIgnoreTypes());
