import { DiagnosticSeverity } from 'vscode';
import { LogicDataEntry } from '../rulesetTree';
import { BaseLogic } from './baseLogic';

type Entry = {
    [key: string]: number | string;
}[];

type AlienMission = {
    waves: Entry;
    raceWeights: Entry;
};

export class AlienMissionsLogic extends BaseLogic {
    private additionalFields = [
        'alienMissions.operationType',
        'alienMissions.objective',
        'alienMissions.raceWeights',
        'alienMissions.refNode',
        'alienMissions.waves',
        'alienMissions.waves[].trajectory',
        'missionScripts.missionWeights',
        'missionScripts.raceWeights',
    ];

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'alienMissions.type': this.checkForRequiredFields,
        'alienMissions.waves[].ufo': this.checkForRequiredWaveFields,
    };

    private data: {
        [key: string]: { [key: string]: number | string | Entry | AlienMission; waves: Entry; refNode: AlienMission };
    } = {};
    private missionData: { [key: string]: { [key: string]: { [key: string]: number | string }[] } } = {};

    public getFields(): string[] {
        return ([] as string[]).concat(this.additionalFields).concat(Object.keys(this.relatedFieldLogicMethods));
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(
            entries,
            this.additionalFields.filter((name) => name.startsWith('alienMissions.')),
            this.data,
            true,
        );
        this.collectGenericData(
            entries,
            this.additionalFields.filter((name) => name.startsWith('missionScripts.')),
            this.missionData,
        );
    }

    private checkForRequiredFields(key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'alienMissions');
            if (!name) {
                continue;
            }

            // This works because it uses operationType: 3 to create a new base with objective: 2 being create base

            if (!this.data[name]?.waves && !this.data[name]?.refNode?.waves) {
                // additional check (by Buscher), https://discord.com/channels/582086836923531270/836314823783481386/898893079468212285
                // "This works because it uses operationType: 3 to create a new base with objective: 2 being create base"
                if (this.data[name]?.operationType === 3 && this.data[name]?.objective === 2) {
                    continue;
                }

                this.addDiagnosticForReference(
                    ref,
                    `'${name}' does not have waves: set. This will lead to a segmentation fault when this mission triggers.`,
                    DiagnosticSeverity.Error,
                );
            }
            if (!this.data[name]?.raceWeights && !this.data[name]?.refNode?.raceWeights) {
                if (!this.inMissionScripts(name)) {
                    this.addDiagnosticForReference(
                        ref,
                        `'${name}' does not have raceWeights: set here or in missionScripts. This will lead to a crash when this mission triggers.`,
                        DiagnosticSeverity.Error,
                    );
                }
            }
        }
    }

    /**
     * Check if this mission is in mission scripts, and whether a raceWeight is set there
     * @param name
     */
    private inMissionScripts(name: string) {
        return (
            Object.values(this.missionData).find((mission) => {
                if (Object.values(mission.missionWeights || {}).find((weights) => name in weights)) {
                    if (mission.raceWeights && Object.values(mission.raceWeights).length > 0) {
                        return true;
                    }
                }

                return false;
            }) !== undefined
        );
    }

    private checkForRequiredWaveFields(key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'alienMissions');
            const index = this.getNameFromMetadata(ref.ref, 'alienMissions.waves[]');
            if (!name || !index) {
                continue;
            }

            const data = this.data[name].waves[parseInt(index)];
            if (!data.trajectory) {
                this.addDiagnosticForReference(
                    ref,
                    `Wave does not have trajectory: set. This will cause a crash on loading OpenXcom!`,
                    DiagnosticSeverity.Error,
                );
            }
        }
    }
}
