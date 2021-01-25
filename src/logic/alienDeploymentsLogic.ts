import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class AlienDeploymentsLogic extends BaseLogic {
    // we need these additional fields to do our check
    private additionalNumericFields = [
        // '/^alienDeployments\\.data\\[\\]\\.(alienRank)$/',
        'alienDeployments.data[].alienRank',
        'alienDeployments.data[].dQty',
        'alienDeployments.data[].extraQty',
    ];

    private additionalFields = [
        'alienDeployments.data',
        // 'alienDeployments.lowQty',
    ];

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'alienDeployments.type': this.checkForRequiredFields,
        'alienDeployments.data[].alienRank': this.checkForRequiredDataFields,
        'alienDeployments.data[].customUnitType': this.checkForRequiredDataFields,
        'alienDeployments.data[].dQty': this.checkForRequiredDataFields,
        'alienDeployments.data[].extraQty': this.checkForRequiredDataFields,
        'alienDeployments.data[].extraRandomItems': this.checkForRequiredDataFields,
        // '/^alienDeployments\\.data\\[\\]\\.(alienRank|customUnitType|dQty|extraQty|extraRandomItems)$/': this.checkForRequiredDataFields,
    }

    private requiredDataFields = ['lowQty', 'highQty'/*, 'percentageOutsideUfo'*/, 'itemSets'];

    protected numericFields = ([] as string[]).concat(this.additionalNumericFields);

    private data: {[key: string]: {[key: string]: number | string | {[key: string]: number | string}[], data: {[key: string]: number | string}[]}} = {};

    private state = this.getDefaultState();

    private getDefaultState () {
        return {
            'dataError': {} as {[key: string]: boolean}
        };
    }

    protected reset() {
        this.state = this.getDefaultState();
    }

    public getFields(): string[] {
        return ([] as string[]).concat(this.additionalFields).concat(Object.keys(this.relatedFieldLogicMethods));
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('alienDeployments.')), this.data);
        // this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('soldiers.')), this.itemData);
    }

    private checkForRequiredFields (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'alienDeployments');
            if (!name) {
                continue;
            }

            if (!(name in this.data) || !('data' in this.data[name])) {

                this.addDiagnosticForReference(
                    ref,
                    `'${name}' does not have data: set. This can lead to crashes in-game.`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }

    private checkForRequiredDataFields (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'alienDeployments');
            const index = this.getNameFromMetadata(ref.ref, 'alienDeployments.data[]');
            if (!name || !index) {
                continue;
            }

            if (!(name in this.data) || !('data' in this.data[name])) {
                continue;
            }

            if (`${index}-${name}` in this.state.dataError) {
                // already complained for this data entry
                continue;
            }

            const data = this.data[name].data[parseInt(index)];

            for (const field of this.requiredDataFields) {
                if (!(field in data)) {
                    this.state.dataError[`${index}-${name}`] = true;

                    this.addDiagnosticForReference(
                        ref,
                        `data entry '${field}' not set. This can lead to crashes in-game.`,
                        DiagnosticSeverity.Error
                    );
                }
            }
        }
    }
}