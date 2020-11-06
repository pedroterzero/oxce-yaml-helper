import { JsonObject } from "./rulesetParser";
import { Variables } from "./rulesetTree";
import { typedProperties } from "./typedProperties";

export class RulesetVariableFinder {
    public findAllVariablesInYamlDocument(doc: JsonObject) {
        const store: Variables = {};

        for (const key in doc) {
            if (typedProperties.isStoreVariable(key)) {
                store[key] = doc[key];
            }
        }

        return store;
    }
}

export const rulesetVariableFinder = new RulesetVariableFinder();
