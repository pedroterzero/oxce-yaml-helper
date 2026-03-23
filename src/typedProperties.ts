import { typeLinks, typeLinksPossibleKeys } from './definitions/typeLinks';
import { logger } from './logger';
import { LogicHandler } from './logic/logicHandler';
import { Match, RuleType } from './rulesetTree';
import {
    getAdditionalGlobalVariablePaths,
    getAdditionalKeyReferenceTypes,
    getAdditionalTypePropertyHints,
    getAdditionalVetoTypes,
} from './utilities';
import typeConfig = require('./definitions/typeConfig.json');

type typeProperties = {
    [key: string]: {
        [key: string]: typePropertyLink;
    };
};

type typePropertyLink = {
    target: string;
    type?: 'numeric';
};

type logicMethod = (key: string, path: string, ruleType: RuleType | Match) => LogicOverride[];

type logicOverrides = {
    [key: string]: logicMethod;
};

type LogicOverride = {
    key: string;
    target: string | undefined;
};

type KeyReferenceOptions = {
    recurse?: boolean;
};

export class typedProperties {
    public static isExtraFilesRule(path: string, key: string | undefined, name: string | undefined): boolean {
        if (!key || !name) {
            return false;
        }

        if (['extraSprites', 'extraSounds'].includes(path) /* && key !== 'type'*/) {
            return `${path}.${name}.files` in this.keyDefinitionTypes;
        }

        return false;
    }

    // fully built from typeLinks now
    private static typeProperties: typeProperties = {};

    // Data fields loaded from typeConfig.json in init(), merged with runtime additions
    private static typePropertyHints: { [key: string]: string[] } = {};
    private static vetoTypes: string[] = [];
    private static globalVariablePaths: string[] = [];
    private static vetoTypeValues: { [key: string]: string[] } = {};
    private static keyDefinitionTypes: { [key: string]: KeyReferenceOptions } = {};
    private static keyReferenceTypes: { [key: string]: KeyReferenceOptions } = {};
    private static keyValueReferenceTypes: string[] = [];
    private static arrayDefinitionTypes: string[] = [];
    private static metadataFields: { [key: string]: string[] } = {};
    private static storeVariables: { [key: string]: boolean } = {};

    // ATTENTION: when adding logic here, it also needs to be happen when checking references
    private static metadataLogicOverrides: logicOverrides = {
        'items.hitAnimation': typedProperties.hitAnimationLogic,
    };

    private static logicOverrides: logicOverrides = {
        ...typedProperties.metadataLogicOverrides,
        'crafts.sprite': typedProperties.typeLinksLogic,
        'craftWeapons.sprite': typedProperties.typeLinksLogic,
        'items.bulletSprite': typedProperties.typeLinksLogic,
    };

    private static additionalLogicPaths: string[] = [];
    private static keyReferenceTypesRegexes: {
        regex: RegExp;
        settings: KeyReferenceOptions;
    }[] = [];
    private static typeLinkRegexes: { regex: RegExp; values: string[] }[] = [];

    // Performance caches for frequently called regex methods
    private static regexTypeLinkCache = new Map<string, string[] | undefined>();
    private static keyReferencePathCache = new Map<string, KeyReferenceOptions | undefined>();

    public static init() {
        // Load base config from JSON
        this.typePropertyHints = { ...typeConfig.typePropertyHints, ...getAdditionalTypePropertyHints() };
        this.vetoTypes = [...typeConfig.vetoTypes, ...getAdditionalVetoTypes()];
        this.globalVariablePaths = [...typeConfig.globalVariablePaths, ...getAdditionalGlobalVariablePaths()];
        this.vetoTypeValues = { ...typeConfig.vetoTypeValues };
        this.keyDefinitionTypes = { ...typeConfig.keyDefinitionTypes };
        this.keyReferenceTypes = { ...this.keyDefinitionTypes, ...typeConfig.keyReferenceTypes, ...getAdditionalKeyReferenceTypes() };
        this.keyValueReferenceTypes = [...typeConfig.keyValueReferenceTypes];
        this.arrayDefinitionTypes = [...typeConfig.arrayDefinitionTypes];
        this.metadataFields = { ...typeConfig.metadataFields };
        this.storeVariables = { ...typeConfig.storeVariables };

        // Clear caches on re-init
        this.regexTypeLinkCache.clear();
        this.keyReferencePathCache.clear();
        this.keyReferenceTypesRegexes = [];
        this.typeLinkRegexes = [];

        this.addTypeLinks();
        this.getAdditionalLogicPaths();
        this.getAdditionalMetadataFields();
        this.loadRegexes();
    }

    public static isDefinitionPropertyForPath(type: string, key: string, value: string): boolean {
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
            this.typePropertyHints[ruleType].forEach((key) => {
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
        if (typeof param === 'object') {
            // reference
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
        const keys = typeLinksPossibleKeys[path](key).filter((key) => !['_all_', '_any_'].includes(key));

        const overrides: LogicOverride[] = [];
        for (const key in targets) {
            overrides.push({
                key: keys[key],
                target: targets[key],
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
                    if ((ruleType.metadata['damageAlter.FixRadius'] as number) === 0) {
                        ignore = true;
                    }
                } else if ('blastRadius' in ruleType.metadata && (ruleType.metadata['blastRadius'] as number) === 0) {
                    ignore = true;
                }

                if (!ignore) {
                    override.target = 'extraSprites.X1.PCK.files';
                }
            }
        }

        return [override];
    }

    public static getMetadataFieldsForType(ruleType: string, rule: any): { [key: string]: string } | undefined {
        const typeKey = this.getTypeKey(rule, ruleType);
        const metadataFields: { [key: string]: string } = {};
        if (typeKey) {
            metadataFields.type = typeKey;
        }

        if (ruleType in this.metadataFields) {
            for (const field of this.metadataFields[ruleType]) {
                metadataFields[field] = field;
            }
        }

        if (Object.keys(metadataFields).length === 0) {
            return;
        }

        return metadataFields;
    }

    public static isStoreVariable(key: string) {
        return key in this.storeVariables;
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
        if (this.keyReferencePathCache.has(path)) {
            return this.keyReferencePathCache.get(path);
        }

        const match = path in this.keyReferenceTypes;
        if (match) {
            const result = this.keyReferenceTypes[path];
            this.keyReferencePathCache.set(path, result);
            return result;
        }

        // allow regex
        for (const type of this.keyReferenceTypesRegexes) {
            if (type.regex.exec(path)) {
                this.keyReferencePathCache.set(path, type.settings);
                return type.settings;
            }
        }

        this.keyReferencePathCache.set(path, undefined);
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
            if (links.find((item) => item === '_numeric_')) {
                numeric = true;
                links = links.filter((item) => item !== '_numeric_');
                // also remove from typeLinks itself
                typeLinks[link] = links;
            }

            // TODO what if there is more?
            this.typeProperties[newLink][key] = {
                target: links[0],
            };

            if (numeric) {
                this.typeProperties[newLink][key].type = 'numeric';
            }
        }
    }

    private static getAdditionalLogicPaths() {
        this.additionalLogicPaths = new LogicHandler().getPaths();
    }

    private static getAdditionalMetadataFields() {
        const fields = new LogicHandler().getAdditionalMetadataFields();
        for (const field of fields) {
            const key = field.split('.').slice(0, -1).join('.');
            const val = field.split('.').slice(-1).join('.');

            if (!(key in this.metadataFields)) {
                this.metadataFields[key] = [];
            }

            this.metadataFields[key].push(val);
        }
    }

    public static isRegexTypeLink(path: string): string[] | undefined {
        if (this.regexTypeLinkCache.has(path)) {
            return this.regexTypeLinkCache.get(path);
        }

        for (const type in this.typeLinkRegexes) {
            const regex = this.typeLinkRegexes[type].regex;
            if (regex.exec(path)) {
                const result = this.typeLinkRegexes[type].values;
                this.regexTypeLinkCache.set(path, result);
                return result;
            }
        }

        this.regexTypeLinkCache.set(path, undefined);
        return;
    }

    private static loadRegexes() {
        for (const type in this.keyReferenceTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.keyReferenceTypesRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    settings: this.keyReferenceTypes[type],
                });
            }
        }

        for (const type in typeLinks) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.typeLinkRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    values: typeLinks[type],
                });

                delete typeLinks[type];
            }
        }
    }
}

typedProperties.init();
