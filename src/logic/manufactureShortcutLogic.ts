import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class ManufactureShortcutLogic extends BaseLogic {
    private additionalFields = [
        // 'soldiers.type',
        'manufactureShortcut.startFrom',
    ];

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'manufactureShortcut.name': this.checkForStartFrom,
    }

    private data: {[key: string]: {[key: string]: number}} = {};

    public getFields(): string[] {
        return ([] as string[]).concat(this.additionalFields).concat(Object.keys(this.relatedFieldLogicMethods));
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('manufactureShortcut.')), this.data);
        // this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('soldiers.')), this.itemData);
    }

    private checkForStartFrom (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'manufactureShortcut');
            if (!name) {
                continue;
            }

            if (!(name in this.data) || !('startFrom' in this.data[name])) {
                this.addDiagnosticForReference(
                    ref,
                    `'${name}' does not have startFrom: set. This will cause a segmentation fault on loading OpenXcom!`,
                    DiagnosticSeverity.Error
                );
            }
            // could check here that it's a valid type, but we already do that generally. otherwise see craftWeaponsLogic
        }
    }
}