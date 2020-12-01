import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic, LogicCheckMethods } from "./baseLogic";

export class TerrainsLogic extends BaseLogic {
    protected fields: LogicCheckMethods = {
        'terrains.mapBlocks[]': [this.checkGroupReferences]
    };

    public checkGroupReferences (entries: LogicDataEntry[]) {
        for (const entry of entries) {
            const data = entry.data;
            data.toString();

            // if (data[0] > data[1]) {
            //     data[1] += 360;

            //     this.addDiagnostic(entry, `Crossing the prime meridian requires a different syntax (change to ${JSON.stringify(data)} to fix this). See wiki.`);
            // }
        }
    }
}