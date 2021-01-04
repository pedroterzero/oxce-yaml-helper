import { DiagnosticSeverity } from "vscode";
import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class UfopaediaLogic extends BaseLogic {
    // we need these additional fields to do our check
    private additionalNumericFields = [
        'ufopaedia.type_id',
    ];

    private additionalFields = [
        'ufopaedia.image_id', // we need to know if there's an image id
    ];//.concat(this.additionalNumericFields);

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'ufopaedia.type_id': this.checkImageProvided,
    }

    private imageRequiredTypeIds = [1, 2, 3, 7, 10, 11, 12, 13, 14, 15, 16, 17];

    // numeric fields makes sure numeric references get picked up by the recursive retriever, and then
    // and then not handled as regular references but only by this logic
    protected numericFields = this.additionalNumericFields;

    private imageIds: {[key: string]: string} = {};

    public getFields(): string[] {
        return this.additionalFields;
    }

    protected generic(entries: LogicDataEntry[]) {
        this.imageIds = this.getFieldData<string>(entries, 'ufopaedia.image_id') || {};
    }

    private checkImageProvided (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const names = ref.ref.metadata?._names as {[key: string]: string};
            if (!names || !('ufopaedia' in names)) {
                continue;
            }

            const name = names.ufopaedia;


            if (!this.imageRequiredTypeIds.includes(parseInt(ref.ref.key))) {
                continue;
            }

            if (name in this.imageIds) {
                continue;
            }

            this.addDiagnosticForReference(
                ref,
                `Ufopaedia articles with type_ids ${this.imageRequiredTypeIds.join(', ')} must have an image_id. Otherwise this will cause a segmentation fault when opening the article!`,
                DiagnosticSeverity.Error
            );
        }
    }
}