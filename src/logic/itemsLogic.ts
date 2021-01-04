import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class ItemsLogic extends BaseLogic {
    // we need these additional fields to do our check
    private additionalNumericFields = [
        'items.confAuto.shots',
        'items.autoShots',
    ];

    private additionalFields = ([
        // 'craftWeapons.clip', // we need to know whether a clip is used, and if so, which
    ] as string[]).concat(this.additionalNumericFields);

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'items.autoShots': this.checkAutoShots,
    }

    // numeric fields makes sure numeric references get picked up by the recursive retriever, and then
    // and then not handled as regular references but only by this logic
    protected numericFields = Object.keys(this.relatedFieldLogicMethods).concat(this.additionalNumericFields);

    private autoShots: {[key: string]: number} = {};
    private confAuto: {[key: string]: number} = {};

    public getFields(): string[] {
        return Object.keys(this.fields).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.autoShots = this.getFieldData<number>(entries, 'items.autoShots') || this.autoShots;
        this.confAuto = this.getFieldData<number>(entries, 'items.confAuto.shots') || this.confAuto;
    }

    private checkAutoShots (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'items');
            if (!name || !(name in this.confAuto) || !(name in this.autoShots)) {
                continue;
            }

            this.addDiagnosticForReference(
                ref,
                `autoShots and confAuto.shots should not both be set!`,
            );
       }
    }
}