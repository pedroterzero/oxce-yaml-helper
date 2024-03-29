import { getAdditionalIgnoreStringTypes, getAdditionalStringTypes } from "../utilities";

export const stringTypes = [
    'alienDeployments.alert',
    'alienDeployments.alertDescription',
    'alienDeployments.briefing.desc',
    'alienDeployments.briefing.title',
    'alienDeployments.markerName',
    'alienDeployments.objectiveComplete',
    'alienDeployments.objectiveFailed',
    'alienDeployments.objectivePopup',
    'alienDeployments.reinforcements[].briefing.desc',
    'alienDeployments.reinforcements[].briefing.title',
    'commendations.description',
    'crafts.weaponStrings',
    'cutscenes.slideshow.slides[].caption',
    'enviroEffects.environmentalConditions.STR_FRIENDLY.message',
    'enviroEffects.environmentalConditions.STR_HOSTILE.message',
    'enviroEffects.environmentalConditions.STR_NEUTRAL.message',
    'events.description',
    'items.confAimed.name',
    'items.confAimed.shortName',
    'items.confAuto.name',
    'items.confAuto.shortName',
    'items.confMelee.name',
    'items.confMelee.shortName',
    'items.confSnap.name',
    'items.confSnap.shortName',
    'items.medikitActionName',
    'items.name', // not sure
    'items.primeActionMessage',
    'items.primeActionName',
    'items.psiAttackName',
    'items.unprimeActionName',
    '/^globalVariables\\.missionRatings\\.-?\\d+$/',
    '/^globalVariables\\.monthlyRatings\\.-?\\d+$/',
    'regions.missionZones[][]',
    'soldiers.rankStrings',
    'ufopaedia.section', // should probably check that the string exists
    'ufopaedia.text',
    'ufopaedia.pages[].text',
    'ufopaedia.pages[].title',
    'ufopaedia.weapon',
    'units.rank',
    // not sure
    // 'items.categories',
    'manufacture.category',
    ...getAdditionalStringTypes()
];

export const ignoreStringTypes = [
    'arcScripts.type',
    'cutscenes.type',
    'extended.tags.BattleGame',
    'extended.tags.BattleItem',
    'extended.tags.BattleUnit',
    'extended.tags.GeoscapeSoldier',
    'extended.tags.RuleArmor',
    'extended.tags.RuleItem',
    'extended.tags.RuleSoldier',
    'extended.tags.RuleSoldierBonus',
    'extended.tags.RuleUfo',
    'extraSprites.type',
    'extraSprites.typeSingle',
    'extraSprites.BASEBITS.PCK.files',
    'extraSprites.BIGOBS.PCK.files',
    'extraSprites.FLOOROB.PCK.files',
    'extraSprites.HANDOB.PCK.files',
    'extraSprites.INTICON.PCK.files',
    'extraSprites.HIT.PCK.files',
    'extraSprites.Projectiles.files',
    'extraSprites.SMOKE.PCK.files',
    'extraSprites.SPICONS.DAT.files',
    'extraSprites.X1.PCK.files',
    'extraSounds.type',
    'extraSounds.BATTLE.CAT.files',
    'extraSounds.GEO.CAT.files',
    'facilities.provideBaseFunc',
    'interfaces.type',
    'mapScripts.type',
    'MCDPatches.type',
    'missionScripts.type',
    'musics.type',
    'startingConditions.type',
    'terrains.mapBlocks[].name',
    'terrains.name',
    'ufoTrajectories.id',
    ...getAdditionalIgnoreStringTypes()
];
