import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class CraftWeaponsLogic extends BaseLogic {
    // we need these additional fields to do our check
    private additionalNumericFields = [
        'items.clipSize', // we need to compare the clipSize to the rearmRate
    ];

    private additionalFields = [
        'craftWeapons.launcher', // we need to know whether a launcher is used, and if so, which
        'craftWeapons.clip', // we need to know whether a clip is used, and if so, which
        'items.type',
    ].concat(this.additionalNumericFields);

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'craftWeapons.rearmRate': this.checkClipSize,
        'craftWeapons.type': this.checkForLauncher,
    }

    // numeric fields makes sure numeric references get picked up by the recursive retriever, and then
    // and then not handled as regular references but only by this logic
    protected numericFields = Object.keys(this.relatedFieldLogicMethods).concat(this.additionalNumericFields);

    private weaponData: {[key: string]: {[key: string]: number}} = {};
    private itemData: {[key: string]: {[key: string]: number}} = {};

    public getFields(): string[] {
        return Object.keys(this.fields).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('craftWeapons.')), this.weaponData);
        this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('items.')), this.itemData);
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

            if (!(name in this.weaponData) || !('clip' in this.weaponData[name])) {
                continue;
            }

            const clipName = this.weaponData[name].clip;
            if (!(clipName in this.itemData)) {
                // should this give an error?
                continue;
            }

            // const clipSize = this.clipSizes[clipName].data as unknown as number;
            const clipSize = this.itemData[clipName].clipSize;
            if (clipSize > parseInt(ref.ref.key)) {
                this.addDiagnosticForReference(
                    ref,
                    `rearmRate of '${ref.ref.key}' is less than clipSize '${clipSize}' for clip '${clipName}'. This will cause a crash on loading OpenXcom!`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }
    private checkForLauncher (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'craftWeapons');
            if (!name) {
                continue;
            }

            if (!(name in this.weaponData) || !('launcher' in this.weaponData[name])) {
                this.addDiagnosticForReference(
                    ref,
                    `'${name}' does not have a launcher: set. This will cause a crash on loading OpenXcom!`,
                    DiagnosticSeverity.Error
                );
            } else if ('launcher' in this.weaponData[name] && !(this.weaponData[name].launcher in this.itemData)) {
                this.addDiagnosticForReference(
                    ref,
                    `'${name}' launcher '${this.weaponData[name].launcher}': item does not exist. This will cause a crash on loading OpenXcom!`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }
}