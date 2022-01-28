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
        'ufopaedia.rect_text',
        'ufopaedia.section'
    ].concat(this.additionalNumericFields);

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'ufopaedia.type_id': this.checkTypeLogic,
        'ufopaedia.id': this.checkTypeProvided,
    };

    private imageRequiredTypeIds = [1, 2/*, 3*/, 7, 10, 11, 12, 13, 14, 15, 16, 17];

    // numeric fields makes sure numeric references get picked up by the recursive retriever, and then
    // and then not handled as regular references but only by this logic
    protected numericFields = this.additionalNumericFields;

    private data: {[key: string]: {[key: string]: number | string}} = {};

    public getFields(): string[] {
        return ([] as string[]).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(entries, this.additionalFields.filter(name => name.startsWith('ufopaedia.')), this.data);
    }

    private checkTypeLogic (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        this.checkImageProvided(key);
        this.checkRectTextProvided(key);
    }

    private checkImageProvided (key: string) {
        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'ufopaedia');
            if (!name) {
                continue;
            }

            if (this.data[name]?.section === 'STR_NOT_AVAILABLE') {
                continue;
            }

            if (!this.imageRequiredTypeIds.includes(parseInt(ref.ref.key))) {
                continue;
            }

            if (!this.data[name]?.image_id) {
                this.addDiagnosticForReference(
                    ref,
                    `Ufopaedia articles with type_ids ${this.imageRequiredTypeIds.join(', ')} must have an image_id. Otherwise this will cause a segmentation fault when opening the article!`,
                    DiagnosticSeverity.Error
                );
            }
        }
    }

    private checkRectTextProvided (key: string) {
        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'ufopaedia');
            if (!name) {
                continue;
            }

            if (this.data[name].type_id === 1 && !this.data[name]?.rect_text) {
                this.addDiagnosticForReference(
                    ref,
                    `Ufopaedia articles with type_ids 1 (Craft) should have rect_text:. Otherwise the text will not show up in the article.`
                );
            }
        }
    }

    private checkTypeProvided (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'ufopaedia');
            if (!name) {
                continue;
            }

            if (this.hierarchy?.hasDefinition('ufopaedia', name)) {
                continue;
            }

            if (!this.data[name]?.type_id) {
                this.addDiagnosticForReference(
                    ref,
                    `'${name}' does not have a type_id: set. Without it, the article will not appear in-game.`
                );
            }
        }
    }
}