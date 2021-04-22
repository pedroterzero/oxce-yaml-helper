import { LogicHandler } from "../logic/logicHandler";
import { getAdditionalLinks } from "../utilities";

type TypeLinks = {
    [key: string]: string[]
    // [key: string]: (string | [string, number])[];
};

export const spriteTypeLinks: TypeLinks = {
    'crafts.sprite': ['_numeric_', 'extraSprites.INTICON.PCK.files', 'extraSprites.INTICON.PCK.files', 'extraSprites.BASEBITS.PCK.files'],
    'craftWeapons.sprite': ['_numeric_', 'extraSprites.INTICON.PCK.files', 'extraSprites.BASEBITS.PCK.files'],
    'facilities.spriteFacility': ['_numeric_', 'extraSprites.BASEBITS.PCK.files'],
    'items.bigSprite': ['_numeric_', 'extraSprites.BIGOBS.PCK.files'],
    'items.bulletSprite': ['_numeric_', 'extraSprites.Projectiles.files'],
    'items.floorSprite': ['_numeric_', 'extraSprites.FLOOROB.PCK.files'],
    'items.handSprite': ['_numeric_', 'extraSprites.HANDOB.PCK.files'],
    'items.hitAnimation': ['_numeric_', 'extraSprites.SMOKE.PCK.files'],
    'items.meleeAnimation': ['_numeric_', 'extraSprites.HIT.PCK.files'],
    'items.specialIconSprite': ['_numeric_', 'extraSprites.SPICONS.DAT.files'],
};

const BATTLE_CAT = 'extraSounds.BATTLE.CAT.files';
export const soundTypeLinks: TypeLinks = {
    'items.explosionHitSound': ['_numeric_', BATTLE_CAT],
    'items.fireSound': ['_numeric_', BATTLE_CAT],
    'items.hitSound': ['_numeric_', BATTLE_CAT],
    'items.hitMissSound': ['_numeric_', BATTLE_CAT],
    'items.meleeHitSound': ['_numeric_', BATTLE_CAT],
    'items.meleeSound': ['_numeric_', BATTLE_CAT],
    'items.psiSound': ['_numeric_', BATTLE_CAT],
    'items.psiMissSound': ['_numeric_', BATTLE_CAT],
    'items.reloadSound': ['_numeric_', BATTLE_CAT],
    'units.aggroSound': ['_numeric_', BATTLE_CAT],
    'units.berserkSound': ['_numeric_', BATTLE_CAT],
    'units.deathSound': ['_numeric_', BATTLE_CAT],
    'units.moveSound': ['_numeric_', BATTLE_CAT],
    'units.panicSound': ['_numeric_', BATTLE_CAT],
};

export const typeLinks: TypeLinks = Object.assign({}, spriteTypeLinks, soundTypeLinks, {
    'alienDeployments.abortCutscene': ['cutscenes'],
    '/^alienDeployments\\.alienBaseUpgrades\\.\\d+$/': ['alienDeployments'],
    'alienDeployments.briefing.cutscene': ['cutscenes'],
    'alienDeployments.briefing.music': ['musics'],
    'alienDeployments.civiliansByType': ['units'],
    'alienDeployments.customUfo': ['ufos'],
    'alienDeployments.data[].extraRandomItems[]': ['items'],
    'alienDeployments.data[].itemSets[]': ['items'],
    'alienDeployments.enviroEffects': ['enviroEffects'],
    'alienDeployments.loseCutscene': ['cutscenes'],
    'alienDeployments.missionBountyItem': ['items'],
    'alienDeployments.nextStage': ['alienDeployments'],
    'alienDeployments.race': ['alienRaces'],
    'alienDeployments.randomRace': ['alienRaces'],
    'alienDeployments.script': ['mapScripts'],
    'alienDeployments.startingCondition': ['startingConditions'],
    'alienDeployments.terrains': ['terrains'],
    'alienDeployments.unlockedResearch': ['research'],
    'alienDeployments.winCutscene': ['cutscenes'],
    'alienMissions.interruptResearch': ['research'],
    'alienMissions.operationBaseType': ['alienDeployments'],
    'alienMissions.waves[].trajectory': ['ufoTrajectories'],
    '/^alienMissions\\.raceWeights\\.\\d+$/': ['alienRaces'],
    '/^alienMissions\\.regionWeights\\.\\d+$/': ['regions'],
    'alienMissions.siteType': ['alienDeployments'],
    'alienMissions.spawnUfo': ['ufos'],
    'alienRaces.baseCustomDeploy': ['alienDeployments'],
    'alienRaces.baseCustomMission': ['alienDeployments'],
    'alienRaces.members': ['units'],
    'alienRaces.membersRandom[]': ['units'],
    'alienRaces.retaliationMission': ['alienMissions'],
    'arcScripts.facilityTriggers': ['facilities'],
    'arcScripts.itemTriggers': ['items'],
    'arcScripts.randomArcs': ['research'],
    'arcScripts.researchTriggers': ['research'],
    'arcScripts.sequentialArcs': ['research'],
    'armors.builtInWeapons': ['items'],
    'armors.corpseBattle': ['items'],
    'armors.corpseGeo': ['items'],
    'armors.requires': ['research'],
    'armors.specialWeapon': ['items'],
    'armors.storeItem': ['items'],
    'armors.spriteInv': ['extraSprites'],
    'armors.tags': ['extended.tags.RuleArmor'],
    'armors.units': ['soldiers'],
    'crafts.refuelItem': ['items'],
    'crafts.requires': ['research'],
    'craftWeapons.clip': ['items'],
    'craftWeapons.launcher': ['items'],
    // 'crafts.weaponStrings': ['craftWeapons.weaponType'], // (is this just a translatable?)
    //enviroEffects
    'enviroEffects.armorTransformations.key': ['armors'], // should only match builtins
    'enviroEffects.armorTransformations.value': ['armors'], // should only match builtins
    'enviroEffects.paletteTransformations.key': ['builtinsOnly'], // should only match builtins
    'enviroEffects.paletteTransformations.value': ['customPalettes'],
    'enviroEffects.inventoryShockIndicator': ['extraSprites'], // untested
    'enviroEffects.mapShockIndicator': ['extraSprites'], // untested
    'events.everyItemList': ['items'],
    'events.everyMultiItemList': ['items'],
    'events.interruptResearch': ['research'],
    'events.randomItemList': ['items'],
    'events.regionList': ['regions'],
    'events.researchList': ['research'],
    'events.spawnedPersonType': ['soldiers'], // also scientists and engineers
    'events.weightedItemList': ['items'],
    '/^eventScripts\\.eventWeights\\.\\d+$/': ['events'],
    'eventScripts.facilityTriggers': ['facilities'],
    'eventScripts.itemTriggers': ['items'],
    'eventScripts.oneTimeRandomEvents': ['events'],
    'eventScripts.oneTimeSequentialEvents': ['events'],
    'eventScripts.researchTriggers': ['research'],
    'facilities.buildCostItems': ['items'],
    'facilities.buildOverFacilities': ['facilities'],
    'facilities.destroyedFacility': ['facilities'],
    'facilities.mapName': ['terrains.mapBlocks[]'],
    'facilities.requires': ['research'],
    'globalVariables.fakeUnderwaterBaseUnlockResearch': ['research'],
    'globalVariables.mana.unlockResearch': ['research'],
    'globalVariables.newBaseUnlockResearch': ['research'],
    'globalVariables.psiUnlockResearch': ['research'],
    'itemCategories.replaceBy': ['itemCategories'],
    'items.categories': ['itemCategories'],
    'items.compatibleAmmo': ['items'],
    '/^items\\.ammo\\.[0-3]\\.compatibleAmmo$/': ['items'],
    'items.defaultInventorySlot': ['invs'],
    'items.requires': ['research'],
    'items.requiresBuy': ['research'],
    'items.requiresBuyBaseFunc': ['facilities.provideBaseFunc'],
    'items.spawnUnit': ['units'],
    'items.supportedInventorySections': ['invs'],
    'items.tags': ['extended.tags.RuleItem'],
    'items.zombieUnit': ['units'],
    'items.zombieUnitByArmorFemale.key': ['armors'],
    'items.zombieUnitByArmorFemale.value': ['units'],
    'items.zombieUnitByArmorMale.key': ['armors'],
    'items.zombieUnitByArmorMale.value': ['units'],
    'items.zombieUnitByType.key': ['_any_', 'soldiers', 'units'], // match any of these
    'items.zombieUnitByType.value': ['units'],
    'manufacture.producedItems': ['items'],
    'manufacture.randomProducedItems[][]': ['items'],
    'manufacture.requiredItems': ['items'],
    'manufacture.requires': ['research'],
    'manufacture.requiresBaseFunc': ['facilities.provideBaseFunc'],
    'manufacture.spawnedPersonType': ['soldiers'], // also scientists and engineers
    'manufactureShortcut.breakDownItems': ['manufacture'],
    'manufactureShortcut.startFrom': ['manufacture'],
    'mapScripts.commands[].craftName': ['crafts'],
    'mapScripts.commands[].randomTerrain': ['terrains'],
    'mapScripts.commands[].terrain': ['terrains'],
    'mapScripts.commands[].UFOName': ['ufos'],
    'mapScripts.commands[].verticalLevels[].terrain': ['terrains'],
    'missionScripts.facilityTriggers': ['facilities'],
    'missionScripts.itemTriggers': ['items'],
    '/^missionScripts\\.missionWeights\\.\\d+$/': ['alienMissions'],
    '/^missionScripts\\.raceWeights\\.\\d+$/': ['alienRaces'],
    '/^missionScripts\\.regionWeights\\.\\d+$/': ['regions'],
    'missionScripts.researchTriggers': ['research'],
    'research.cutscene': ['cutscenes'],
    'research.dependencies': ['research'],
    'research.disables': ['research'],
    'research.getOneFree': ['research'],
    'research.getOneFreeProtected': ['research'],
    '/^research\\.getOneFreeProtected\\.[a-zA-Z0-9_]+$/': ['research'],
    'research.lookup': ['research'],
    'research.requires': ['research'],
    'research.requiresBaseFunc': ['facilities.provideBaseFunc'],
    'research.spawnedEvent': ['events'],
    'research.spawnedItem': ['items'],
    'research.unlocks': ['research'],
    'skills.requiredBonuses': ['soldierBonuses'],
    'soldiers.armor': ['armors'],
    'soldiers.requires': ['research'],
    'soldiers.skills': ['skills'],
    'soldiers.specialWeapon': ['items'],
    'soldierTransformation.soldierBonusType': ['soldierBonuses'],
    'startingBase.crafts[].type': ['crafts'],
    'startingBase.crafts[].weapons[].type': ['craftWeapons'],
    'startingBase.facilities[].type': ['facilities'],
    'startingBase.items': ['items'],
    'startingBase.randomSoldiers': ['soldiers'],
    'startingConditions.allowedArmors': ['armors'],
    'startingConditions.allowedCraft': ['crafts'],
    'startingConditions.allowedItemCategories': ['itemCategories'],
    'startingConditions.allowedItems': ['items'],
    'startingConditions.allowedSoldierTypes': ['soldiers'],
    'startingConditions.allowedVehicles': ['units'],
    'startingConditions.defaultArmor': ['soldiers'],
    '/^startingConditions\\.defaultArmor\\.[a-zA-Z0-9_]+$/': ['armors'],
    'startingConditions.forbiddenArmors': ['armors'],
    'startingConditions.forbiddenCraft': ['crafts'],
    'startingConditions.forbiddenItemCategories': ['itemCategories'],
    'startingConditions.forbiddenItems': ['items'],
    'startingConditions.forbiddenSoldierTypes': ['soldiers'],
    'startingConditions.forbiddenVehicles': ['units'],
    'startingConditions.requiredItems': ['items'],
    'terrains.civilianTypes': ['units'],
    'terrains.enviroEffects': ['enviroEffects'],
    'terrains.mapBlocks[].items': ['items'],
    'terrains.mapBlocks[].randomizedItems[].itemList': ['items'],
    'terrains.script': ['mapScripts'],
    'ufopaedia.requires': ['research'],
    'ufopaedia.weapon': ['items'],
    'ufos.raceBonus': ['alienRaces'],
    'units.armor': ['armors'],
    'units.builtInWeaponSets[]': ['items'],
    'units.psiWeapon': ['items'],
    'units.spawnUnit': ['units']
}, getAdditionalLinks());

// add numeric fields from logic handler
const handler = new LogicHandler;
for (const field of handler.getNumericFields()) {
    typeLinks[field] = ['_numeric_', '_dummy_'];
}
// add non numeric fields too
for (const field of handler.getRelatedLogicFields().filter(field => !handler.getNumericFields().includes(field))) {
    typeLinks[field] = ['_dummy_'];
}

export const typeLinksPossibleKeys: {[key: string]: (key: string) => string[]} = {
    // could improve this even more to make this all for the [MF][0123] variants?
    'armors.spriteInv': (key) => [
        '_any_',
        `${key}`,
        `${key}.PCK`,
        `${key}.SPK`,
        `${key}F0.SPK`,
        `${key}F1.SPK`,
        `${key}F2.SPK`,
        `${key}F3.SPK`,
        `${key}M0.SPK`,
        `${key}M1.SPK`,
        `${key}M2.SPK`,
        `${key}M2.SPK`,
    ],
    'craftWeapons.sprite': (key) => ['_all_', `${parseInt(key) + 5}`, `${parseInt(key) + 48}`],
    'crafts.sprite': (key) => ['_all_', `${key}`, `${parseInt(key) + 11}`, `${parseInt(key) + 33}`],
    'items.bulletSprite': (key) => [`${parseInt(key) * 35}`],
};