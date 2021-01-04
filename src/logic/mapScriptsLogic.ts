import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class MapScriptsLogic extends BaseLogic {
    private additionalFields = [
        // 'terrains.mapBlocks[].groups' // need terrains.script too
        'terrains' // we need to know the terrain data to find existing groups
    ];

    protected relatedFieldLogicMethods = {
        'mapScripts.commands[].verticalGroup': this.checkGroupReferences,
        'mapScripts.commands[].crossingGroup': this.checkGroupReferences,
        'mapScripts.commands[].groups': this.checkGroupReferences,
    }

    // numeric fields makes sure numeric references get picked up by the recursive retriever
    protected numericFields = Object.keys(this.relatedFieldLogicMethods);

    private mapBlockGroups: {[key: string]: number[]} = {};

    public getFields(): string[] {
        return Object.keys(this.fields).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.storeMapblockGroups(entries);
    }

    // public checkRelationLogic () {
    //     this.checkGroupReferences();
    // }

    // public checkVerticalGroupReferences (key: string) {
    //     this.checkGroupReferences(key);
    // }

    // public checkCrossingGroupReferences (key: string) {
    //     this.checkGroupReferences(key);
    // }

    private checkGroupReferences (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;

        }
        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'mapScripts');
            if (!name) {
                continue;
            }

            if (!(name in this.mapBlockGroups)) {
                // should this give an error?
                continue;
            }

            if (!this.mapBlockGroups[name].includes(parseInt(ref.ref.key))) {
                this.addDiagnosticForReference(
                    ref,
                    `'Group '${ref.ref.key}' does not exist in terrain for ${name}. This will cause a segmentation fault when loading the map!`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }

    private storeMapblockGroups(entries: LogicDataEntry[]) {
        for (const entry of entries) {
            const data = entry.data;

            if (!data.script) {
                continue;
            }

            const groups: {[key: string]: number} = {};
            for (const block of data.mapBlocks) {
                if ('groups' in block) {
                    if (typeof block.groups === 'number') {
                        groups[block.groups] = 1;
                    } else {
                        for (const group of block.groups) {
                            groups[group] = 1;
                        }
                    }
                }
            }

            const uniqueGroups = Object.keys(groups).map(group => parseInt(group));
            if (uniqueGroups.length > 0) {
                this.mapBlockGroups[data.script] = uniqueGroups;
            }
        }
    }
}