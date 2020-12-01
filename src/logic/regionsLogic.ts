import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic, LogicCheckMethods } from "./baseLogic";

export class RegionsLogic extends BaseLogic {
    protected fields: LogicCheckMethods = {
        'regions.missionZones[][]': [this.checkMissionCoordinates]
    };

    public checkMissionCoordinates (entries: LogicDataEntry[]) {
        for (const entry of entries) {
            const data = entry.data;

            if (data[0] > data[1]) {
                data[1] += 360;

                this.addDiagnosticForLogicEntry(entry, `Crossing the prime meridian requires a different syntax (change to ${JSON.stringify(data)} to fix this). See wiki.`);
            }
        }
    }
}