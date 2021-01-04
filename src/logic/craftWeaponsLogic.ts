import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class CraftWeaponsLogic extends BaseLogic {
    // we need these additional fields to do our check
    private additionalNumericFields = [
        'items.clipSize', // we need to compare the clipSize to the rearmRate
    ];

    private additionalFields = [
        'craftWeapons.clip', // we need to know whether a clip is used, and if so, which
    ].concat(this.additionalNumericFields);

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'craftWeapons.rearmRate': this.checkClipSize,
    }

    // numeric fields makes sure numeric references get picked up by the recursive retriever, and then
    // and then not handled as regular references but only by this logic
    protected numericFields = Object.keys(this.relatedFieldLogicMethods).concat(this.additionalNumericFields);

    // private clipSizes: {[key: string]: LogicDataEntry} = {};
    private clipSizes: {[key: string]: number} = {};
    private clipTypes: {[key: string]: string} = {};

    public getFields(): string[] {
        return Object.keys(this.fields).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.clipSizes = this.getFieldData<number>(entries, 'items.clipSize') || this.clipSizes;
        this.clipTypes = this.getFieldData<string>(entries, 'craftWeapons.clip') || this.clipTypes;
    }

    private checkClipSize (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'craftWeapons');
            if (!name) {
                continue;
            }

            if (!(name in this.clipTypes)) {
                continue;
            }

            const clipName = this.clipTypes[name];
            if (!(clipName in this.clipSizes)) {
                // should this give an error?
                continue;
            }

            // const clipSize = this.clipSizes[clipName].data as unknown as number;
            const clipSize = this.clipSizes[clipName];
            if (clipSize > parseInt(ref.ref.key)) {
                this.addDiagnosticForReference(
                    ref,
                    `'rearmRate of '${ref.ref.key}' is less than clipSize '${clipSize}' for clip '${clipName}'. This will cause a crash on loading OpenXcom!`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }
}