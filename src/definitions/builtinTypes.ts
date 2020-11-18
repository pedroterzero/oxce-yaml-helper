const builtinBackgrounds = [
    'BACK01.SCR', 'BACK02.SCR', 'BACK03.SCR', 'BACK04.SCR', 'BACK05.SCR',
    'BACK06.SCR', 'BACK07.SCR', 'BACK08.SCR', 'BACK09.SCR', 'BACK10.SCR',
    'BACK11.SCR', 'BACK12.SCR', 'BACK13.SCR', 'BACK14.SCR', 'BACK15.SCR',
    'BACK16.SCR', 'BACK17.SCR',
];

const builtinUfopaediaImages = [
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

const builtinArmorSprites = [
    'MAN_0F0', 'MAN_0F1', 'MAN_0F2', 'MAN_0F3', 'MAN_0M0',
    'MAN_0M1', 'MAN_0M2', 'MAN_0M3', 'MAN_1F0', 'MAN_1F1',
    'MAN_1F2', 'MAN_1F3', 'MAN_1M0', 'MAN_1M1', 'MAN_1M2',
    'MAN_1M3', 'MAN_2', 'MAN_3'
];

const builtinPalettes = [
    'BACKPALS.DAT', 'PAL_BASESCAPE', 'PAL_BATTLEPEDIA', 'PAL_BATTLESCAPE', 'PAL_GEOSCAPE', 'PAL_GRAPHS', 'PAL_UFOPAEDIA'
];

const soundIds = [-1, 54];
const smokeIds = [-1, 55];
const bigSpriteIds = [-1, 56];
const floorSpriteIds = [-1, 72];
const handSpriteIds = [-1, 127];

export const builtinResourceIds: {[key: string]: number[]} = {
    'items.bigSprite': bigSpriteIds,
    'items.explosionHitSound': soundIds,
    'items.fireSound': soundIds,
    'items.floorSprite': floorSpriteIds,
    'items.handSprite': handSpriteIds,
    'items.hitAnimation': smokeIds,
    'items.hitSound': soundIds,
    'items.meleeSound': soundIds,
    'items.meleeHitSound': soundIds,
    'items.specialIconSprite': [-1, 2],
    'units.aggroSound': soundIds,
    'units.deathSound': soundIds,
    'units.moveSound': soundIds,
};

export const builtinTypes: {[key: string]: string[]} = {
    'alienDeployments.alertBackground': builtinBackgrounds,
    'alienDeployments.briefing.background': builtinBackgrounds,
    'alienDeployments.extendedObjectiveType': ['STR_EVACUATION', 'STR_FRIENDLY_VIP', 'STR_ITEM_EXTRACTION'], // FtA
    'alienMissions.waves[].ufo': ['dummy'],
    'armors.spriteInv': builtinArmorSprites,
    'armors.spriteSheet': [
        'CELATID.PCK', 'CIVM.PCK', 'CHRYS.PCK', 'CYBER.PCK', 'FLOATER.PCK', 'ETHEREAL.PCK', 'MUTON.PCK',
        'SECTOID.PCK', 'SILACOID.PCK', 'SNAKEMAN.PCK', 'X_REAP.PCK', 'X_ROB.PCK',
        'XCOM_0.PCK', 'XCOM_1.PCK', 'XCOM_2.PCK', 'ZOMBIE.PCK'
    ],
    'armors.storeItem': ['STR_NONE'],
    'converter.markers': ['STR_UFO', 'STR_TERROR_SITE', 'STR_LANDING_SITE', 'STR_CRASH_SITE', 'STR_WAYPOINT'],
    'converter.alienRanks': ['_COMMANDER', '_LEADER', '_ENGINEER', '_MEDIC', '_NAVIGATOR', '_SOLDIER', '_TERRORIST'],
    'customPalettes.target': builtinPalettes,
    'enviroEffects.paletteTransformations.PAL_BATTLESCAPE': ['PAL_BATTLESCAPE_1', 'PAL_BATTLESCAPE_2', 'PAL_BATTLESCAPE_3'],
    'events.background': builtinBackgrounds,
    'interfaces.backgroundImage': builtinBackgrounds,
    'manufacture.category': [
        'STR_AMMUNITION', 'STR_CRAFT', 'STR_CRAFT_AMMUNITION', 'STR_CRAFT_WEAPON',
        'STR_EQUIPMENT', 'STR_WEAPON'
    ],
    'manufacture.spawnedPersonType': ['STR_ENGINEER', 'STR_SCIENTIST'],
    'units.rank': [
        'STR_LIVE_COMMANDER', 'STR_LIVE_ENGINEER', 'STR_LIVE_LEADER', 'STR_LIVE_MEDIC',
        'STR_LIVE_NAVIGATOR', 'STR_LIVE_SOLDIER', 'STR_LIVE_TERRORIST',
        'STR_CIVILIAN' /* OXCE */
    ],
    'startingBase.crafts[].status': ['STR_READY', 'STR_REPAIRS'],
    'startingConditions.allowedItems': ['STR_NONE'],
    'startingConditions.allowedVehicles': ['STR_NONE'],
    'ufos.size': ['STR_LARGE', 'STR_MEDIUM_UC', 'STR_SMALL', 'STR_VERY_LARGE', 'STR_VERY_SMALL'],
    'units.civilianRecoveryType': ['STR_ENGINEER', 'STR_SCIENTIST'],
    'ufopaedia.image_id': builtinUfopaediaImages,
};