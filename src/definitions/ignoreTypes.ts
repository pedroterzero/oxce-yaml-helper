import { typedProperties } from "../typedProperties";
import { getAdditionalIgnoreTypes } from "../utilities";

/**
 * Prevent the following types being checked as references
 *
 * ATTENTION: a lot of these are in here not because they have unknowable values, but because the json schema validator is already catching them
 */
export const ignoreTypes = [
    'armors.layersDefaultPrefix',
    'armors.scripts.damageUnit',
    'armors.scripts.hitUnit',
    'armors.scripts.recolorUnitSprite',
    'armors.scripts.selectUnitSprite',
    'alienDeployments.music', // not sure about this one (check that files exist? stock? GMTACTIC6?)
    'crafts.battlescapeTerrainData.mapBlocks[].name', // may want to check that the files exist
    'crafts.battlescapeTerrainData.mapDataSets', // may want to check that the files exist
    'crafts.battlescapeTerrainData.name', // may want to check that the files exist
    'cutscenes.videos', // may want to check that the files exist
    'cutscenes.slideshow.slides[].imagePath', // may want to check that the files exist
    'customPalettes.file', // may want to check that the files exist
    // 'extended.scripts',
    // 'extended.tags.BattleItem',
    // 'extended.tags.BattleUnit',
    // 'extended.tags.RuleArmor',
    // 'extended.tags.RuleItem',
    // 'extended.tags.RuleSoldierBonus',
    'extraSprites.fileSingle', // may want to check that the files exist
    // TODO CHECK THIS (this was not here, then it was extraSprites.files.0, then regexed)
    '/^extraSprites\\.files\\.\\d+/', // may want to check that the files exist
    // 'facilities.mapName', // may want to check that the files exist
    'interfaces.elements[].id', // could type check this, but the validator probably catches these
    'interfaces.palette', // could type check this, but the validator probably catches these
    'items.scripts.createItem',
    'items.scripts.selectItemSprite',
    'globe.data', // may want to check that the files exist
    'mapScripts.commands[].type',
    'mapScripts.commands[].direction',
    'mapScripts.commands[].tunnelData.MCDReplacements[].type',
    'mapScripts.commands[].verticalLevels[].type', // validator should get it
    'missionScripts.varName', // seems it can be ignored (according to Finnik)
    'soldiers.soldierNames', // may want to check that the files exist
    // 'terrains.mapBlocks[].name', // check that the mapblock files exist
    'terrains.mapDataSets', // check that the terrains exist
    'ufos.battlescapeTerrainData.mapBlocks[].name', // may want to check that the files exist
    'ufos.battlescapeTerrainData.mapDataSets', // may want to check that the files exist
    'ufos.battlescapeTerrainData.name', // may want to check that the files exist
    'units.race', // optional according to Finnik
    // 'units.civilianRecoveryType', // ruleset validator will catch it
].concat(typedProperties.getStoreVariables(), getAdditionalIgnoreTypes());
