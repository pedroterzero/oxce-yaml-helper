import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class MapScriptsLogic extends BaseLogic {
    private additionalFields = [
        // 'terrains.mapBlocks[].groups' // need terrains.script too
        'terrains' // we need to know the terrain data to find existing groups
    ];

    protected additionalMetadataFields = [
        'mapScripts.commands[].terrain',
    ];

    protected relatedFieldLogicMethods = {
        'mapScripts.commands[].verticalGroup': this.checkGroupReferences,
        'mapScripts.commands[].crossingGroup': this.checkGroupReferences,
        'mapScripts.commands[].groups': this.checkGroupReferences,
    }

    // numeric fields makes sure numeric references get picked up by the recursive retriever
    protected numericFields = Object.keys(this.relatedFieldLogicMethods);

    private mapBlockGroups: {[key: string]: number[]} = {};
    private mapBlockGroupsByTerrain: {[key: string]: number[]} = {};

    public getFields(): string[] {
        return Object.keys(this.fields).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.storeMapblockGroups(entries);
    }

    private checkGroupReferences (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            let name;
            let isTerrainReference = false;
            if (ref.ref.metadata && 'terrain' in ref.ref.metadata && typeof ref.ref.metadata.terrain === 'string') {
                // if there is a terrain set for this command, use that as reference
                name = ref.ref.metadata.terrain;
                isTerrainReference = true;
            } else {
                name = this.getNameFromMetadata(ref.ref, 'mapScripts');
            }

            if (!name) {
                continue;
            }

            if (isTerrainReference) {
                if (!(name in this.mapBlockGroupsByTerrain)) {
                    // should this give an error?
                    continue;
                }

                if (!this.mapBlockGroupsByTerrain[name].includes(parseInt(ref.ref.key))) {
                    this.addDiagnosticForReference(
                        ref,
                        `'Group '${ref.ref.key}' does not exist in terrain for ${name}. This will cause a segmentation fault when loading the map!`,
                        DiagnosticSeverity.Error
                    );
                }
            } else {
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
    }

    private storeMapblockGroups(entries: LogicDataEntry[]) {
        for (const entry of entries) {
            const data = entry.data;

            if (!data.mapBlocks || (!data.script && !data.name)) {
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
                if (data.script) {
                    this.mapBlockGroups[data.script] = uniqueGroups;
                } else {
                    // store by terrain name if there is no script
                    this.mapBlockGroupsByTerrain[data.name] = uniqueGroups;
                }
            }
        }
    }
}