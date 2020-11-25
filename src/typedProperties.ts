import { typeLinks } from "./definitions/typeLinks";
import { logger } from "./logger";
import { RuleType } from "./rulesetTree";

type typePropertyHints = {
    [key: string]: string[]
}

type typeProperties = {
    [key: string]: {
        [key: string]: typePropertyLink
    }
}

type typePropertyLink = {
    target: string;
    type?: 'numeric'
}

type logicOverrides = {
    [key: string]: string;
}

type logicMethods = {
    [key: string]: (key: string, ruleType: RuleType) => LogicOverride;
}

type metadataFields = {
    [key: string]: string[]
};

type LogicOverride = {
    key: string;
    target: string | undefined;
}

export class typedProperties {
    // properties for which 'name' is the key
    private static typePropertyHints: typePropertyHints = {
        alienRaces: ['id'],
        covertOperations: ['name'],               // FtA
        diplomacyFactions: ['name'],              // FtA
        events: ['name'],                         // FtA
        extraSprites: ['type', 'typeSingle'],
        facilities: ['type', 'provideBaseFunc'],
        invs: ['id'],
        manufacture: ['name'],
        manufactureShortcut: ['name'],
        research: ['name'],
        soldierBonuses: ['name'],
        soldierTransformation: ['name'],
        terrains: ['name'],
        'terrains.mapBlocks[]': ['name'],
        ufopaedia: ['id'],
        ufoTrajectories: ['id'],
    };

    private static vetoTypes: string[] = [
        'battleScripts.commands[]', // FtA
        'extraStrings',
        'mapScripts.commands[]',
        'mapScripts.commands[].tunnelData.MCDReplacements[]',
        'mapScripts.commands[].verticalLevels[]',
        'startingBase.crafts[]',
        'startingBase.crafts[].weapons[]',
        'startingBase.facilities[]',
    ];

    private static vetoTypeValues: {[key: string]: string[]} = {
        // 'extraSprites': ['BASEBITS.PCK', 'BIGOBS.PCK', 'FLOOROB.PCK', 'HANDOB.PCK', 'INTICON.PCK', 'Projectiles', 'SMOKE.PCK'],
    };

    // maybe combine this with keyReferenceTypes, or use this in that? or always check both?
    private static keyDefinitionTypes: string[] = [
        // not 100% sure about these yet. Perhaps they should only work for the current file? maybe they're not deifnitions at all?
        'extended.tags.BattleGame',
        'extended.tags.BattleItem',
        'extended.tags.BattleUnit',
        'extended.tags.GeoscapeSoldier',
        'extended.tags.RuleArmor',
        'extended.tags.RuleItem',
        'extended.tags.RuleSoldier',
        'extended.tags.RuleSoldierBonus',
    ];

    private static keyReferenceTypes: string[] = typedProperties.keyDefinitionTypes.concat([
        'arcScripts.randomArcs',
        'arcScripts.researchTriggers',
        'arcScripts.itemTriggers',
        'arcScripts.facilityTriggers',
        'alienDeployments.civiliansByType',
        '/^alienDeployments\\.alienBaseUpgrades\\.\\d+$/',
        '/^alienMissions\\.raceWeights\\.\\d+$/',
        '/^alienMissions\\.regionWeights\\.\\d+$/',
        'covertOperations.instantSuccessDeployment', // FtA
        'covertOperations.instantTrapDeployment', // FtA
        'covertOperations.failureReputationScore', // FtA
        'covertOperations.requiredItems', // FtA
        'covertOperations.successReputationScore', // FtA
        'diplomacyFactions.helpTreatyEvents', // FtA
        'diplomacyFactions.helpTreatyMissions', // FtA
        'enviroEffects.environmentalConditions',
        'events.everyMultiItemList',
        'events.weightedItemList',
        'eventScripts.itemTriggers',
        'eventScripts.facilityTriggers',
        'eventScripts.oneTimeRandomEvents',
        '/^eventScripts\\.eventWeights\\.\\d+$/',
        'eventScripts.researchTriggers',
        'facilities.buildCostItems',
        'items.tags',
        'manufacture.requiredItems',
        'manufacture.producedItems',
        'manufacture.randomProducedItems[][]',
        '/^missionScripts\\.missionWeights\\.\\d+$/',
        '/^missionScripts\\.raceWeights\\.\\d+$/',
        '/^missionScripts\\.regionWeights\\.\\d+$/',
        // '/^manufacture\\.randomProducedItems[][]\\.[a-zA-Z0-9_]+$/',
        'missionScripts.researchTriggers',
        'missionScripts.itemTriggers',
        'missionScripts.facilityTriggers',
        'research.getOneFreeProtected',
        'startingBase.items',
        'startingBase.randomSoldiers',
        'startingConditions.defaultArmor',
        '/^startingConditions\\.defaultArmor\\.[a-zA-Z0-9_]+$/',
        'startingConditions.requiredItems',
        'ufos.raceBonus',
        'terrains.mapBlocks[].items',
    ]);

    private static keyValueReferenceTypes: string[] = [
        'enviroEffects.armorTransformations',
        'enviroEffects.paletteTransformations',
        'items.zombieUnitByType',
        'items.zombieUnitByArmorFemale',
        'items.zombieUnitByArmorMale',
    ];

    private static arrayDefinitionTypes: string[] = [
        'facilities.provideBaseFunc',
    ];

    private static typeProperties: typeProperties = {
        crafts: {
            sprite: {target: 'extraSprites.INTICON.PCK.files', type: 'numeric'},
        },
        craftWeapons: {
            sprite: {target: 'extraSprites.INTICON.PCK.files', type: 'numeric'},
        },
        facilities: {
            spriteFacility: {target: 'extraSprites.BASEBITS.PCK.files', type: 'numeric'},
        },
        // research: {
        //     name: {target: 'ufopaedia'},
        //     dependencies: {target: 'research'},
        //     // getOneFree: {target: 'research'},
        // },
        items: {
            bigSprite: {target: 'extraSprites.BIGOBS.PCK.files', type: 'numeric'},
            explosionHitSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            fireSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            floorSprite: {target: 'extraSprites.FLOOROB.PCK.files', type: 'numeric'},
            handSprite: {target: 'extraSprites.HANDOB.PCK.files', type: 'numeric'},
            hitAnimation: {target: 'extraSprites.SMOKE.PCK.files', type: 'numeric'},
            hitSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            hitMissSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            meleeAnimation: {target: 'extraSprites.HIT.PCK.files', type: 'numeric'},
            meleeHitSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            meleeSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            psiSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            psiMissSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            reloadSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            specialIconSprite: {target: 'extraSprites.SPICONS.DAT.files', type: 'numeric'},
        },
        units: {
            aggroSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            berserkSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            deathSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            moveSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
            panicSound: {target: 'extraSounds.BATTLE.CAT.files', type: 'numeric'},
        }
    }

    private static logicOverrides: logicOverrides = {
        'items.bulletSprite': 'bulletSpriteLogic',
        'items.hitAnimation': 'hitAnimationLogic',
    }
    private static logicMethods: logicMethods = {
        'bulletSpriteLogic': typedProperties.bulletSpriteLogic,
        'hitAnimationLogic': typedProperties.hitAnimationLogic,
    };

    private static metadataFields: metadataFields = {
        'items': ['damageType'],
    }

    private static storeVariables: {[key: string]: Record<string, unknown>} = {
        'ftaGame': {}
    }

    public static init () {
        this.addTypeLinks();
    }

    public static isDefinitionPropertyForPath (type: string, key: string, value: string): boolean {
        if (this.vetoTypes.indexOf(type) !== -1) {
            // explicitly blacklist some paths
            return false;
        } else if (type in this.vetoTypeValues && this.vetoTypeValues[type].indexOf(value) !== -1) {
            return false;
        }

        // check if this a key definition
        if (this.isKeyDefinitionType(type + '.' + key)) {
            return true;
        }

        if (type in this.typePropertyHints) {
            return this.typePropertyHints[type].indexOf(key) !== -1;
        }

        return key === 'type';
    }

    public static isKeyDefinitionType(type: string) {
        return this.keyDefinitionTypes.indexOf(type) !== -1;
    }

    public static isArrayDefinitionTypes(type: string) {
        return this.arrayDefinitionTypes.indexOf(type) !== -1;
    }

    public static getTypeKey(rule: any, ruleType: string): string | undefined {
        if (typeof rule !== 'object') {
            // for now, only handle objects
            return;
        }

        let typeKey: string | undefined;
        if ('type' in rule) {
            typeKey = 'type';
        }

        if (ruleType in this.typePropertyHints) {
            this.typePropertyHints[ruleType].forEach(key => {
                if (key in rule) {
                    typeKey = key;
                }
            });
        }

        return typeKey;
    }

    /**
     * Check that a rule that is looking up a definition has a specific link set, if so, use only that
     * @param sourceRuleType
     * @param ruleType
     */
    public static isTargetForSourceRule(sourceRuleType: RuleType | undefined, ruleType: string): boolean {
        if (!sourceRuleType) {
            return true;
        }

        if (!(sourceRuleType.type in this.typeProperties)) {
            return true;
        }

        const link = this.typeProperties[sourceRuleType.type];
        if (!(sourceRuleType.key in link)) {
            return true;
        }

        return link[sourceRuleType.key].target === ruleType;
    }

    public static checkForLogicOverrides(key: string, sourceRuleType: RuleType | undefined): LogicOverride {
        if (!sourceRuleType) {
            return this.getBaseOverride(key);
        }

        const fullType = sourceRuleType.type + '.' + sourceRuleType.key;

        if (!(fullType in this.logicOverrides)) {
            return this.getBaseOverride(key);
        }

        const method = this.logicMethods[this.logicOverrides[fullType]].bind(this);
        const override = method(key, sourceRuleType);

        if (key !== override.key) {
            logger.debug(`Overriding key for ${fullType} from ${key} to ${override.key}`);
        }
        if (override.target) {
            logger.debug(`Overriding target type for ${fullType}=${key} to ${override.target}`);
        }

        return override;
    }

    private static getBaseOverride(key: string): LogicOverride {
        return {
            key,
            target: undefined,
        };
    }

    private static bulletSpriteLogic(key: string): LogicOverride {
        const override = this.getBaseOverride(key);
        override.key = (parseInt(key) * 35).toString();
        return override;
    }

    private static hitAnimationLogic(key: string, ruleType: RuleType): LogicOverride {
        const override = typedProperties.getBaseOverride(key);

        if (!ruleType?.metadata) {
            return override;
        }

        if ('damageType' in ruleType.metadata) {
            const damageType = ruleType.metadata.damageType as number;

            if (['2', '3', '6', '9'].indexOf(damageType.toString()) !== -1) {
                override.target = 'extraSprites.X1.PCK.files';
            }
        }

        return override;
    }

    public static getMetadataFieldsForType(ruleType: string, rule: any): {[key: string]: string} | undefined {
        const typeKey = this.getTypeKey(rule, ruleType);
        const metadataFields: {[key: string]: string} = {};
        if (typeKey) {
            metadataFields.type = typeKey;
        }

        if (ruleType in this.metadataFields) {
            for (const field of  this.metadataFields[ruleType]) {
                metadataFields[field] = field;
            }
        }

        if (Object.keys(metadataFields).length === 0) {
            return;
        }

        return metadataFields;
    }

    public static isStoreVariable(key: string) {
        return (key in this.storeVariables);
    }

    /**
     * Checks that a provided type key is supposed to be numeric
     * @param type
     * @param key
     */
    public static isNumericProperty(type: string, key: string): boolean {
        if (!(type in this.typeProperties)) {
            return false;
        }

        const property = this.typeProperties[type];
        if (!(key in property)) {
            return false;
        }

        // logger.debug(`type ${type}.${key} is ${(property[key].type || '')}`);
        return (property[key].type || '') === 'numeric';
    }

    public static isKeyReferencePath(path: string): boolean {
        const match = this.keyReferenceTypes.indexOf(path) !== -1;
        if (match) {
            return true;
        }

        // allow regex
        for (const type of this.keyReferenceTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                const regex = new RegExp(type.slice(1, -1));
                if (regex.exec(path)) {
                    return true;
                }
            }
        }

        return false;
    }

    public static isKeyValueReferencePath(path: string) {
        return this.keyValueReferenceTypes.indexOf(path) !== -1;
    }

    private static addTypeLinks() {
        for (const link in typeLinks) {
            if (link.startsWith('/') && link.endsWith('/')) {
                continue;
            }

            // const target = ;
            const newLink = link.split('.').slice(0, -1).join('.');
            const key = link.split('.').slice(-1).join('.');

            // console.log(`new link ${newLink} new key ${key}`);
            if (!(newLink in this.typeProperties)) {
                this.typeProperties[newLink] = {};
            }

            // todo what if there is more?
            this.typeProperties[newLink][key] = {
                target: typeLinks[link][0]
            };
        }
    }
}