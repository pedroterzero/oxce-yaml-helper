import { typeLinks, typeLinksPossibleKeys } from "./definitions/typeLinks";
import { logger } from "./logger";
import { LogicHandler } from "./logic/logicHandler";
import { Match, RuleType } from "./rulesetTree";
import { getAdditionalGlobalVariablePaths, getAdditionalKeyReferenceTypes, getAdditionalTypePropertyHints, getAdditionalVetoTypes } from "./utilities";

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


type logicMethod = (key: string, path: string, ruleType: RuleType | Match) => LogicOverride[];

type logicOverrides = {
    [key: string]: logicMethod;
}

type metadataFields = {
    [key: string]: string[]
};

type LogicOverride = {
    key: string;
    target: string | undefined;
}

type KeyReferenceOptions = {
    recurse?: boolean
}

export class typedProperties {
    public static isExtraFilesRule(path: string, key: string | undefined, name: string | undefined): boolean {
        if (!key || !name) {
            return false;
        }

        if (['extraSprites', 'extraSounds'].includes(path) && key !== 'type') {
           return `${path}.${name}.files` in this.keyDefinitionTypes;
        }

        return false;
    }

    // properties for which 'type' is not the (only) key
    private static typePropertyHints: typePropertyHints = {
        alienRaces: ['id'],
        extraSprites: ['type', 'typeSingle'],
        events: ['name'],
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
        ...getAdditionalTypePropertyHints()
    };

    private static vetoTypes: string[] = [
        'extraStrings',
        'facilities.verticalLevels[]',
        'mapScripts.commands[]',
        'mapScripts.commands[].tunnelData.MCDReplacements[]',
        'mapScripts.commands[].verticalLevels[]',
        'startingBase.crafts[]',
        'startingBase.crafts[].weapons[]',
        'startingBase.facilities[]',
        // reinstate regex for this?
        'startingBaseBeginner.crafts[]',
        'startingBaseBeginner.crafts[].weapons[]',
        'startingBaseBeginner.facilities[]',
        'startingBaseExperienced.crafts[]',
        'startingBaseExperienced.crafts[].weapons[]',
        'startingBaseExperienced.facilities[]',
        'startingBaseVeteran.crafts[]',
        'startingBaseVeteran.crafts[].weapons[]',
        'startingBaseVeteran.facilities[]',
        'startingBaseGenius.crafts[]',
        'startingBaseGenius.crafts[].weapons[]',
        'startingBaseGenius.facilities[]',
        'startingBaseSuperhuman.crafts[]',
        'startingBaseSuperhuman.crafts[].weapons[]',
        'startingBaseSuperhuman.facilities[]',
        ...getAdditionalVetoTypes()
    ];

    private static globalVariablePaths = [
        'ai',
        'constants',
        'fixedUserOptions',
        'gameOver',
        'health',
        'lighting',
        'mana',
        'missionRatings',
        'monthlyRatings',
        'recommendedUserOptions',
        ...getAdditionalGlobalVariablePaths()
    ];

    private static vetoTypeValues: {[key: string]: string[]} = {
        // 'extraSprites': ['BASEBITS.PCK', 'BIGOBS.PCK', 'FLOOROB.PCK', 'HANDOB.PCK', 'INTICON.PCK', 'Projectiles', 'SMOKE.PCK'],
    };

    // maybe combine this with keyReferenceTypes, or use this in that? or always check both?
    private static keyDefinitionTypes: {[key: string]: KeyReferenceOptions} = {
        // not 100% sure about these yet. Perhaps they should only work for the current file? maybe they're not definitions at all?
        'extended.tags.BattleGame': {},
        'extended.tags.BattleItem': {},
        'extended.tags.BattleUnit': {},
        'extended.tags.GeoscapeSoldier': {},
        'extended.tags.RuleArmor': {},
        'extended.tags.RuleItem': {},
        'extended.tags.RuleSoldier': {},
        'extended.tags.RuleSoldierBonus': {},
        'extended.tags.RuleUfo': {},
        'extraSprites.BASEBITS.PCK.files': {recurse: false},
        'extraSprites.BIGOBS.PCK.files': {recurse: false},
        'extraSprites.FLOOROB.PCK.files': {recurse: false},
        'extraSprites.HANDOB.PCK.files': {recurse: false},
        'extraSprites.INTICON.PCK.files': {recurse: false},
        'extraSprites.HIT.PCK.files': {recurse: false},
        'extraSprites.Projectiles.files': {recurse: false},
        'extraSprites.SMOKE.PCK.files': {recurse: false},
        'extraSprites.SPICONS.DAT.files': {recurse: false},
        'extraSprites.X1.PCK.files': {recurse: false},
        'extraSounds.BATTLE.CAT.files': {recurse: false},
        'extraSounds.GEO.CAT.files': {recurse: false},
        // '/^extraSprites\\.[a-zA-Z0-9]+(\\.PCK)?\\.files\\.\\d+$/',
    };

    private static keyReferenceTypes: {[key: string]: KeyReferenceOptions} = {
        ...typedProperties.keyDefinitionTypes,
        'arcScripts.randomArcs': {},
        'arcScripts.researchTriggers': {},
        'arcScripts.itemTriggers': {},
        'arcScripts.facilityTriggers': {},
        'alienDeployments.civiliansByType': {},
        '/^alienDeployments\\.alienBaseUpgrades\\.\\d+$/': {},
        '/^alienMissions\\.raceWeights\\.\\d+$/': {},
        '/^alienMissions\\.regionWeights\\.\\d+$/': {},
        'enviroEffects.environmentalConditions': {},
        'events.everyMultiItemList': {},
        'events.weightedItemList': {},
        'eventScripts.itemTriggers': {},
        'eventScripts.facilityTriggers': {},
        'eventScripts.oneTimeRandomEvents': {},
        '/^eventScripts\\.eventWeights\\.\\d+$/': {},
        'eventScripts.researchTriggers': {},
        'facilities.buildCostItems': {},
        'items.tags': {},
        'manufacture.requiredItems': {},
        'manufacture.producedItems': {},
        'manufacture.randomProducedItems[][]': {},
        '/^missionScripts\\.missionWeights\\.\\d+$/': {},
        '/^missionScripts\\.raceWeights\\.\\d+$/': {},
        '/^missionScripts\\.regionWeights\\.\\d+$/': {},
        // '/^manufacture\\.randomProducedItems[][]\\.[a-zA-Z0-9_]+$/': {},
        'missionScripts.researchTriggers': {},
        'missionScripts.itemTriggers': {},
        'missionScripts.facilityTriggers': {},
        'research.getOneFreeProtected': {},
        'startingBase.items': {},
        'startingBase.randomSoldiers': {},
        'startingConditions.defaultArmor': {},
        '/^startingConditions\\.defaultArmor\\.[a-zA-Z0-9_]+$/': {},
        'startingConditions.requiredItems': {},
        'ufos.raceBonus': {},
        'terrains.mapBlocks[].items': {},
        ...getAdditionalKeyReferenceTypes()
    };

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


    // fully built from typeLinks now
    private static typeProperties: typeProperties = {};

    // ATTENTION: when adding logic here, it also needs to be happen when checking references
    private static metadataLogicOverrides: logicOverrides = {
        'items.hitAnimation':  typedProperties.hitAnimationLogic,
    };

    private static logicOverrides: logicOverrides = Object.assign({}, typedProperties.metadataLogicOverrides, {
        'crafts.sprite': typedProperties.typeLinksLogic,
        'craftWeapons.sprite': typedProperties.typeLinksLogic,
        'items.bulletSprite': typedProperties.typeLinksLogic,
    });

    private static metadataFields: metadataFields = {
        'items': ['damageType', 'blastRadius', 'damageAlter.FixRadius'],
        'extraSprites.BIGOBS.PCK': ['height', 'width', 'subX', 'subY'],
        'extraSprites.HANDOB.PCK': ['height', 'width', 'subX', 'subY'],
        'extraSprites.FLOOROB.PCK': ['height', 'width', 'subX', 'subY'],
        'extraSprites.INTICON.PCK': ['height', 'width', 'subX', 'subY'],
        'extraSprites.Projectiles': ['height', 'subY'],
    };

    private static storeVariables: {[key: string]: boolean} = {
        'globalVariables.ftaGame': true
    };

    private static additionalLogicPaths: string[] = [];
    private static keyReferenceTypesRegexes: {regex: RegExp, settings: KeyReferenceOptions}[] = [];
    private static typeLinkRegexes: {regex: RegExp, values: string[]}[] = [];

    public static init () {
        this.addTypeLinks();
        this.getAdditionalLogicPaths();
        this.getAdditionalMetadataFields();
        this.loadRegexes();
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
        return type in this.keyDefinitionTypes;
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

    public static getPossibleTypeKeys(ruleType: string): string[] {
        return this.typePropertyHints[ruleType] || ['type'];
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

        // check regexes
        for (const type in this.typeLinkRegexes) {
            const regex = this.typeLinkRegexes[type].regex;
            if (regex.exec(`${sourceRuleType.type}.${sourceRuleType.key}`)) {
                // see if this is a regex type link
                return this.typeLinkRegexes[type].values.includes(ruleType);
            }
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

    public static getDefinitionTypeForReference(path: string): string | undefined {
        // const [root, subPath] = path.split('.', );
        const root = path.split('.').slice(0, 1).join('.');
        const subPath = path.split('.').slice(1).join('.');

        if (!this.typeProperties[root] || !this.typeProperties[root][subPath]) {
            const targets = this.isRegexTypeLink(path);
            if (targets) {
                if (targets.length > 1) {
                    logger.warn('More than one target found, only returning first!');
                }
                return targets[0];
            }

            return;
        }

        return this.typeProperties[root][subPath].target;
    }

    public static checkForMetadataLogicOverrides(reference: Match): LogicOverride[] | undefined {
        if (reference.path in this.metadataLogicOverrides) {
            return this.checkForLogicOverrides(reference);
        }

        return;
    }

    public static checkForLogicOverrides(reference: Match, dummy?: undefined): LogicOverride[];
    public static checkForLogicOverrides(key: string, sourceRuleType: RuleType | undefined): LogicOverride[];
    public static checkForLogicOverrides(param: string | Match, sourceRuleType: RuleType | undefined): LogicOverride[] {
        if (typeof param === 'object') { // reference
            return this.getLogicOverrides(param.key, param.path, param);
        }

        const key = param as string;

        if (!sourceRuleType) {
            return [this.getBaseOverride(key)];
        }

        return this.getLogicOverrides(key, sourceRuleType.type + '.' + sourceRuleType.key, sourceRuleType);
    }

    private static getLogicOverrides(key: string, path: string, reference: Match | RuleType): LogicOverride[] {
        if (!(path in this.logicOverrides)) {
            return [this.getBaseOverride(key)];
        }

        const overrides = this.logicOverrides[path].bind(this)(key, path, reference);
        for (const override of overrides) {
            if (key !== override.key) {
                logger.debug(`Overriding key for ${path} from ${key} to ${override.key}`);
            }
            if (override.target) {
                logger.debug(`Overriding target type for ${path}=${key} to ${override.target}`);
            }
        }

        return overrides;
    }

    private static getBaseOverride(key: string): LogicOverride {
        return {
            key,
            target: undefined,
        };
    }

    /**
     * Makes it possible to use the same logic as is used in the reference checker from typeLinks without writing 'extra' code
     * @param key
     * @param path
     */
    private static typeLinksLogic(key: string, path: string): LogicOverride[] {
        const targets = typeLinks[path];
        const keys = typeLinksPossibleKeys[path](key).filter(key => !['_all_', '_any_'].includes(key));

        const overrides: LogicOverride[] = [];
        for (const key in targets) {
            overrides.push({
                key: keys[key],
                target: targets[key]
            });
        }

        return overrides;
    }

    private static hitAnimationLogic(key: string, _path: string, ruleType: RuleType | Match): LogicOverride[] {
        const override = typedProperties.getBaseOverride(key);

        if (!ruleType?.metadata) {
            return [override];
        }

        if ('damageType' in ruleType.metadata) {
            const damageType = ruleType.metadata.damageType as number;

            if (['2', '3', '6', '9'].indexOf(damageType.toString()) !== -1) {
                let ignore = false;
                if ('damageAlter.FixRadius' in ruleType.metadata) {
                    if (ruleType.metadata['damageAlter.FixRadius'] as number === 0) {
                        ignore = true;
                    }
                } else if ('blastRadius' in ruleType.metadata && ruleType.metadata['blastRadius'] as number === 0) {
                    ignore = true;
                }

                if (!ignore) {
                    override.target = 'extraSprites.X1.PCK.files';
                }
            }
        }

        return [override];
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

    public static getStoreVariables() {
        return Object.keys(this.storeVariables);
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

    public static isKeyReferencePath(path: string): KeyReferenceOptions | undefined {
        const match = path in this.keyReferenceTypes;
        if (match) {
            return this.keyReferenceTypes[path];
        }

        // allow regex
        for (const type of this.keyReferenceTypesRegexes) {
            if (type.regex.exec(path)) {
                return type.settings;
            }
        }

        return;
    }

    public static isKeyValueReferencePath(path: string) {
        return this.keyValueReferenceTypes.includes(path);
    }

    public static isGlobalVariablePath(path: string) {
        return this.globalVariablePaths.includes(path);
    }

    public static isAdditionalLogicPath(path: string) {
        return this.additionalLogicPaths.includes(path);
    }

    private static addTypeLinks() {
        for (const link in typeLinks) {
            if (link.startsWith('/') && link.endsWith('/')) {
                continue;
            }

            const newLink = link.split('.').slice(0, 1).join('.');
            const key = link.split('.').slice(1).join('.');

            // console.log(`new link ${newLink} new key ${key}`);
            if (!(newLink in this.typeProperties)) {
                this.typeProperties[newLink] = {};
            }

            let links = typeLinks[link];
            let numeric = false;
            if (links.find(item => item === '_numeric_')) {
                numeric = true;
                links = links.filter(item => item !== '_numeric_');
                // also remove from typeLinks itself
                typeLinks[link] = links;
            }

            // TODO what if there is more?
            this.typeProperties[newLink][key] = {
                target: links[0]
            };

            if (numeric) {
                this.typeProperties[newLink][key].type = 'numeric';
            }
        }
    }

    private static getAdditionalLogicPaths () {
        this.additionalLogicPaths = (new LogicHandler).getPaths();
    }

    private static getAdditionalMetadataFields () {
        const fields = (new LogicHandler).getAdditionalMetadataFields();
        for (const field of fields) {
            const key = field.split('.').slice(0, -1).join('.');
            const val = field.split('.').slice(-1).join('.');

            if (!(key in this.metadataFields)) {
                this.metadataFields[key] = [];
            }

            this.metadataFields[key].push(val);
        }
    }

    public static isRegexTypeLink(path: string) {
        for (const type in this.typeLinkRegexes) {
            const regex = this.typeLinkRegexes[type].regex;
            if (regex.exec(path)) {
                return this.typeLinkRegexes[type].values;
            }
        }

        return;
    }

    private static loadRegexes () {
        // @TODO is this called more than once?
        if (this.keyReferenceTypesRegexes.length > 0) {
            logger.error('Should not happen!');
            return;
        }

        for (const type in this.keyReferenceTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.keyReferenceTypesRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    settings: this.keyReferenceTypes[type]
                });
            }
        }

        for (const type in typeLinks) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.typeLinkRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    values: typeLinks[type]
                });

                delete typeLinks[type];
            }
        }
    }
}

typedProperties.init();
