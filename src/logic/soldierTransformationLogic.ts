import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class SoldierTransformationLogic extends BaseLogic {
    private additionalFields = [
        // 'soldiers.type',
        'soldierTransformation.allowedSoldierTypes',
    ];

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'soldierTransformation.name': this.checkForAllowedSoldierTypes,
    }

    private transformationData: {[key: string]: {[key: string]: number}} = {};
    // private itemData: {[key: string]: {[key: string]: number}} = {};

    public getFields(): string[] {
        return ([] as string[]).concat(this.additionalFields).concat(Object.keys(this.relatedFieldLogicMethods));
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('soldierTransformation.')), this.transformationData);
        // this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('soldiers.')), this.itemData);
    }

    private checkForAllowedSoldierTypes (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'soldierTransformation');
            if (!name) {
                continue;
            }

            if (!(name in this.transformationData) || !('allowedSoldierTypes' in this.transformationData[name])) {
                this.addDiagnosticForReference(
                    ref,
                    `'${name}' does not have allowedSoldierTypes: set. Without it, it can never be used in-game.`
                );
            }
            // could check here that it's a valid type, but we already do that generally. otherwise see craftWeaponsLogic
        }
    }
}