
import { Match, Variables } from "./rulesetTree";
import { typedProperties } from "./typedProperties";

export class RulesetVariableFinder {
    public findAllVariablesInYamlDocument(references: Match[] | undefined) {
        const store: Variables = {};

        if (!references) {
            return store;
        }

        for (const ref of references) {
            if (typedProperties.isStoreVariable(ref.path)) {
                let path = ref.path;
                if (path.startsWith('globalVariables.')) {
                    path = path.split('.').slice(1).join('.');
                }

                store[path] = ref.key;
            }
        }

        return store;
    }
}

export const rulesetVariableFinder = new RulesetVariableFinder();
