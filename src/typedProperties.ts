interface typePropertyHints {
    [key: string]: string[]
}

export class typedProperties {
    // properties for which 'name' is the key
    private static typePropertyHints: typePropertyHints = {
        'covertOperations': ['name'],               // FtA
        'diplomacyFactions': ['name'],              // FtA
        'events': ['name'],                         // FtA
        'extraSprites': ['type', 'typeSingle'],
        'research': ['name'],
        'terrain': ['name']
    };

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

        if (ruleType in this.typePropertyHints) {
            this.typePropertyHints[ruleType].forEach(key => {
                if (key in rule) {
                    typeKey = key;
                }
            });
        }

        return typeKey;
    }
}