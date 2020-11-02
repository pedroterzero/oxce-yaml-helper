export class typedProperties {
    public static isTypePropertyForKey (ruleType: string, rule: any, key: string): boolean {
        if (typeof rule !== 'object') {
            // for now, only handle objects
            return false;
        }

        let typeKey = typedProperties.getTypeKey(rule, ruleType);
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
        let typeKey: string | undefined;
        if ('type' in rule) {
            typeKey = 'type';
        }

        if (ruleType === 'extraSprites' && 'typeSingle' in rule) {
            typeKey = 'typeSingle';
        }

        return typeKey;
    }
}