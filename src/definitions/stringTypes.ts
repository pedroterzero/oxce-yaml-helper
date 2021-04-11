import { getAdditionalStringTypes } from "../utilities";

export const stringTypes = ([] as string[]).concat([
    'alienDeployments.alert',
    'alienDeployments.alertDescription',
    'alienDeployments.briefing.desc',
    'alienDeployments.briefing.title',
    'alienDeployments.markerName',
    'alienDeployments.objectiveComplete',
    'alienDeployments.objectivePopup',
    'commendations.description',
    'crafts.weaponStrings',
    'cutscenes.slideshow.slides[].caption',
    'enviroEffects.environmentalConditions.STR_FRIENDLY.message',
    'enviroEffects.environmentalConditions.STR_HOSTILE.message',
    'enviroEffects.environmentalConditions.STR_NEUTRAL.message',
    'events.description',
    'items.confAimed.name',
    'items.confAuto.name',
    'items.confMelee.name',
    'items.confSnap.name',
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
    // not sure
    // 'items.categories',
    // 'manufacture.category',
], getAdditionalStringTypes());
