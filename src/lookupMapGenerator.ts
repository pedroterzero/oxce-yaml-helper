import { flatten } from "flat"
import { LookupMap, Ruleset } from "./rulesetTree";

export class LookupMapGenerator {

    private rulesetTree;

    public constructor(rulesetTree: Ruleset) {
        this.rulesetTree = rulesetTree;
    }

    public generateLookupMap(): LookupMap {
        return flatten(this.rulesetTree);
    }
}
