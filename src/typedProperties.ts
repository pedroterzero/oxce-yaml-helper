import { logger } from "./logger";
import { RuleType } from "./rulesetTree";

type typePropertyHints = {
    [key: string]: string[]
}

type typePropertyLinks = {
    [key: string]: {
        [key: string]: typePropertyLink
    }
}

type typePropertyLink = {
    target: string;
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
        manufacture: ['name'],
        research: ['name'],
        // soldierBonuses: ['name'],
        // soldierTransformation: ['name'],
        terrains: ['name'],
        ufopaedia: ['id'],
        ufoTrajectories: ['id'],
    };

    private static typePropertyLinks: typePropertyLinks = {
        crafts: {
            sprite: {target: 'extraSprites.INTICON.PCK.files'},
        },
        craftWeapons: {
            sprite: {target: 'extraSprites.INTICON.PCK.files'},
        },
        facilities: {
            spriteFacility: {target: 'extraSprites.BASEBITS.PCK.files'},
        },
        research: {
            name: {target: 'ufopaedia'},
            dependencies: {target: 'research'},
            // getOneFree: {target: 'research'},
        },
        items: {
            bigSprite: {target: 'extraSprites.BIGOBS.PCK.files'},
            explosionHitSound: {target: 'extraSounds.BATTLE.CAT.files'},
            fireSound: {target: 'extraSounds.BATTLE.CAT.files'},
            floorSprite: {target: 'extraSprites.FLOOROB.PCK.files'},
            handSprite: {target: 'extraSprites.HANDOB.PCK.files'},
            hitAnimation: {target: 'extraSprites.X1.PCK.files'},
            hitSound: {target: 'extraSounds.BATTLE.CAT.files'},
            hitMissSound: {target: 'extraSounds.BATTLE.CAT.files'},
            meleeAnimation: {target: 'extraSprites.HIT.PCK.files'},
            meleeHitSound: {target: 'extraSounds.BATTLE.CAT.files'},
            meleeSound: {target: 'extraSounds.BATTLE.CAT.files'},
            psiSound: {target: 'extraSounds.BATTLE.CAT.files'},
            psiMissSound: {target: 'extraSounds.BATTLE.CAT.files'},
            reloadSound: {target: 'extraSounds.BATTLE.CAT.files'},
            specialIconSprite: {target: 'extraSprites.SPICONS.DAT.files'},
        },
        units: {
            aggroSound: {target: 'extraSounds.BATTLE.CAT.files'},
            berserkSound: {target: 'extraSounds.BATTLE.CAT.files'},
            deathSound: {target: 'extraSounds.BATTLE.CAT.files'},
            moveSound: {target: 'extraSounds.BATTLE.CAT.files'},
            panicSound: {target: 'extraSounds.BATTLE.CAT.files'},
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

    public static isTypePropertyForKey (ruleType: string, rule: any, key: string): boolean {
        if (typeof rule !== 'object') {
            // for now, only handle objects
            return false;
        }

        const typeKey = this.getTypeKey(rule, ruleType);
        if (!typeKey) {
            return false;
        }

        const property = rule[typeKey];
        if (property === key || property.indexOf(key + '.') === 0) {
            return true;
        }

        return false;
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

        if (!(sourceRuleType.type in this.typePropertyLinks)) {
            return true;
        }

        const link = this.typePropertyLinks[sourceRuleType.type];
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
                override.target = 'extraSprites.SMOKE.PCK.files';
            }
        }

        return override;
    }

    public static getMetadataFieldsForType(ruleType: string): string[] | undefined {
        if (!(ruleType in this.metadataFields)) {
            return;
        }

        return this.metadataFields[ruleType];
    }

    public static isStoreVariable(key: string) {
        return (key in this.storeVariables);
    }
}