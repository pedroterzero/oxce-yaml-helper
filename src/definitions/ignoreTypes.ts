/**
 * Prevent the following types being checked as references
 */
export const ignoreTypes = [
    'armors.layersDefaultPrefix',
    'armors.scripts.damageUnit',
    'armors.scripts.selectUnitSprite',
    'armors.spriteInv', // TODO: FIX THIS%
    'alienDeployments.music', // not sure about this one (check that files exist? stock? GMTACTIC6?)
    'battleScripts.commands[].spawnBlocks', // FtA
    'battleScripts.commands[].type', // FtA
    'covertOperations.specialRule', // FtA
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
    // 'facilities.mapName', // may want to check that the files exist
    'interfaces.elements[].id', // could type check this, but the validator probably catches these
    'interfaces.palette', // could type check this, but the validator probably catches these
    'items.scripts.createItem',
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
    'units.specialObjectiveType', // FtA, ruleset validator will catch it
];
