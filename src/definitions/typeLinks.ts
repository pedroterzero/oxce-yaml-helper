export const typeLinks: {[key: string]: string[]} = {
    'alienDeployments.abortCutscene': ['cutscenes'],
    '/^alienDeployments\\.alienBaseUpgrades\\.\\d+$/': ['alienDeployments'],
    'alienDeployments.battleScript': ['battleScripts'], // FtA
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
    'alienRaces.baseCustomDeploy': ['alienDeployments'],
    'alienRaces.baseCustomMission': ['alienDeployments'],
    'alienRaces.members': ['units'],
    'alienRaces.membersRandom[]': ['units'],
    'alienRaces.retaliationMission': ['alienMissions'],
    'armors.builtInWeapons': ['items'],
    'armors.corpseBattle': ['items'],
    'armors.corpseGeo': ['items'],
    'armors.requires': ['research'],
    'armors.specialWeapon': ['items'],
    'armors.storeItem': ['items'],
    'armors.tags': ['extended.tags.RuleArmor'],
    // 'armors.units': ['armors'],
    'crafts.refuelItem': ['items'],
    'crafts.requires': ['research'],
    'crafts.weaponStrings': ['craftWeapons.weaponType'], //not sure if syntax correct (is this just a translatable?)
    'facilities.buildCostItems': ['items'],
    'facilities.buildOverFacilities': ['facilities'],
    'facilities.destroyedFacility': ['facilities'],
    'facilities.mapName': ['terrains.mapBlocks[]'],
    'facilities.requires': ['research'],
    'itemCategories.replaceBy': ['itemCategories'],
    '/^items\\.ammo\\.[0-3]\\.compatibleAmmo$/': ['items'],
    'items.categories': ['itemCategories'],
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
    'items.zombieUnitByType.key': ['units'],
    'items.zombieUnitByType.value': ['units'],
    'mapScripts.commands[].craftName': ['crafts'],
    'mapScripts.commands[].randomTerrain': ['terrains'],
    'mapScripts.commands[].terrain': ['terrains'],
    'mapScripts.commands[].UFOName': ['ufos'],
    'mapScripts.commands[].verticalLevels[].terrain': ['terrains'],
    'research.lookup': ['research'],
    'research.cutscene': ['cutscenes'],
    'research.spawnedItem': ['items'],
    'research.spawnedEvent': ['events'],
    'research.dependencies': ['research'],
    'research.unlocks': ['research'],
    'research.disables': ['research'],
    'research.getOneFree': ['research'],
    'research.getOneFreeProtected': ['research'],
    'research.sequentialGetOneFree': ['research'],
    'research.requires': ['research'],
    'research.requiresBaseFunc': ['facilities.provideBaseFunc'],
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
    'terrains.civilianTypes': ['units'],
    'terrains.enviroEffects': ['enviroEffects'],
    'terrains.mapBlocks[].items': ['items'],
    'terrains.mapBlocks[].randomizedItems[].itemList': ['items'],
    'terrains.script': ['mapScripts'],
    'ufos.raceBonus': ['alienRaces'],
    'units.armor': ['armors'],
    'units.builtInWeaponSets[]': ['items'],
    'units.psiWeapon': ['items'],
    'units.spawnUnit': ['units'],
    'startingConditions.defaultArmor': ['armors'],
    'startingConditions.allowedArmors': ['armors'],
    'startingConditions.forbiddenArmors': ['armors'],
    'startingConditions.allowedVehicles': ['units'],
    'startingConditions.forbiddenVehicles': ['units'],
    'startingConditions.allowedItems': ['items'],
    'startingConditions.forbiddenItems': ['items'],
    'startingConditions.allowedItemCategories': ['itemCategories'],
    'startingConditions.forbiddenItemCategories': ['itemCategories'],
    'startingConditions.allowedCraft': ['crafts'],
    'startingConditions.forbiddenCraft': ['crafts'],
    'startingConditions.allowedSoldierTypes': ['soldiers'],
    'startingConditions.forbiddenSoldierTypes': ['soldiers'],
    'startingConditions.requiredItems': ['items'], //offtopic - this is my very first property I've added to the engine - Finnik
    //enviroEffects
    'manufacture.requires': ['research'],
    'manufacture.requiresBaseFunc': ['facilities.provideBaseFunc'],
    'manufacture.requiredItems': ['items'],
    'manufacture.producedItems': ['items'],
    'manufacture.randomProducedItems': ['items'],
    'manufacture.spawnedPersonType': ['soldiers'], // also scientists and engineers
    'manufactureShortcut.startFrom': ['manufacture'],
    'manufactureShortcut.breakDownItems': ['manufacture'],
    'manufactureShortcut.breakDownRequires': ['research'],
    'manufactureShortcut.breakDownRequiresBaseFunc': ['facilities.provideBaseFunc'],
    'ufopaedia.requires': ['research'],
    'ufopaedia.weapon': ['items'],
    'alienMissions.spawnUfo': ['ufos'],
    'alienMissions.interruptResearch': ['research'],
    'alienMissions.raceWeights': ['alienRaces'],
    'alienMissions.siteType': ['alienDeployments'],
    'alienMissions.operationBaseType': ['alienDeployments'],
    'alienMissions.regionWeights': ['regions'],
    'missionScripts.missionWeights': ['alienMissions'],
    'missionScripts.raceWeights': ['alienMissions'],
    'missionScripts.regionWeights': ['regions'],
    'missionScripts.researchTriggers': ['research'],
    'missionScripts.itemTriggers': ['items'],
    'missionScripts.facilityTriggers': ['facilities'],
    'arcScripts.sequentialArcs': ['research'],
    'arcScripts.randomArcs': ['research'],
    'arcScripts.researchTriggers': ['research'],
    'arcScripts.itemTriggers': ['items'],
    'arcScripts.facilityTriggers': ['facilities'],
    'eventScripts.oneTimeSequentialEvents': ['events'],
    'eventScripts.oneTimeRandomEvents': ['events'],
    'eventScripts.eventWeights': ['events'],
    'eventScripts.researchTriggers': ['research'],
    'eventScripts.itemTriggers': ['items'],
    'eventScripts.facilityTriggers': ['facilities'],
    'events.regionList': ['regions'],
    'events.spawnedPersonType': ['soldiers'], // also scientists and engineers
    'events.everyItemList': ['items'],
    'events.everyMultiItemList': ['items'],
    'events.randomItemList': ['items'],
    'events.weightedItemList': ['items'],
    'events.researchList': ['research'],
    'events.interruptResearch': ['research'],
};
