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

export class typedProperties {
    // properties for which 'name' is the key
    private static typePropertyHints: typePropertyHints = {
        covertOperations: ['name'],               // FtA
        diplomacyFactions: ['name'],              // FtA
        events: ['name'],                         // FtA
        extraSprites: ['type', 'typeSingle'],
        research: ['name'],
        terrains: ['name'],
        ufopaedia: ['id'],
    };

    private static typePropertyLinks: typePropertyLinks = {
        research: {
            name: {target: 'ufopaedia'},
            dependencies: {target: 'research'},
            // getOneFree: {target: 'research'},
        },
        items: {
            bigSprite: {target: 'extraSprites.BIGOBS.PCK.files'},
            floorSprite: {target: 'extraSprites.FLOOROB.PCK.files'},
            handSprite: {target: 'extraSprites.HANDOB.PCK.files'},
            hitAnimation: {target: 'extraSprites.X1.PCK.files'},
            meleeAnimation: {target: 'extraSprites.HIT.PCK.files'},
            specialIconSprite: {target: 'extraSprites.SPICONS.DAT.files'},
        }
    }

    public static isTypePropertyForKey (ruleType: string, rule: any, key: string): boolean {
        if (typeof rule !== 'object') {
            // for now, only handle objects
            return false;
        }

        let typeKey = this.getTypeKey(rule, ruleType);
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
}