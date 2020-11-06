import { Document } from "yaml";
import { Variables } from "./rulesetTree";
import { typedProperties } from "./typedProperties";

export class RulesetVariableFinder {
    public findAllVariablesInYamlDocument(doc: Document) {
        const flat = doc.toJSON();
        const store: Variables = {};

        for (const key in flat) {
            if (typedProperties.isStoreVariable(key)) {
                store[key] = flat[key];
            }
        }

        return store;
    }

}

export const rulesetVariableFinder = new RulesetVariableFinder();
