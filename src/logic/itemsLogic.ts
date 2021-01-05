import { LogicDataEntry } from "../rulesetTree";
import { BaseLogic } from "./baseLogic";

export class ItemsLogic extends BaseLogic {
    // we need these additional fields to do our check
    private additionalNumericFields = [
        'items.confAuto.shots',
        'items.autoShots',
        'items.costAimed.time',
        'items.costSnap.time',
        'items.costAuto.time',
        'items.costMelee.time',
        'items.tuAimed',
        'items.tuSnap',
        'items.tuAuto',
        'items.tuMelee',
        'items.accuracyAimed',
        'items.accuracySnap',
        'items.accuracyAuto',
        'items.accuracyMelee',
    ];

    private additionalFields = ([
        // 'craftWeapons.clip', // we need to know whether a clip is used, and if so, which
    ] as string[]).concat(this.additionalNumericFields);

    // this is the field we will be checking
    protected relatedFieldLogicMethods = {
        'items.autoShots': this.checkAutoShots,
        'items.costAimed.time': this.checkCostAndAccuracy,
        'items.costSnap.time': this.checkCostAndAccuracy,
        'items.costAuto.time': this.checkCostAndAccuracy,
        'items.costMelee.time': this.checkCostAndAccuracy,
        'items.tuAimed': this.checkCostAndAccuracy,
        'items.tuSnap': this.checkCostAndAccuracy,
        'items.tuAuto': this.checkCostAndAccuracy,
        'items.tuMelee': this.checkCostAndAccuracy,
        'items.accuracyAimed': this.checkCostAndAccuracy,
        'items.accuracySnap': this.checkCostAndAccuracy,
        'items.accuracyAuto': this.checkCostAndAccuracy,
        'items.accuracyMelee': this.checkCostAndAccuracy,
    };

    // numeric fields makes sure numeric references get picked up by the recursive retriever, and then
    // and then not handled as regular references but only by this logic
    protected numericFields = Object.keys(this.relatedFieldLogicMethods).concat(this.additionalNumericFields);

    private data: {[key: string]: {[key: string]: number}} = {};

    public getFields(): string[] {
        return Object.keys(this.fields).concat(this.additionalFields);
    }

    protected generic(entries: LogicDataEntry[]) {
        this.collectGenericData(entries, this.numericFields, this.data);
    }

    private checkCostAndAccuracy (key: string) {
        const matches = key.match(/^items\.(cost|tu|accuracy)(Aimed|Snap|Auto|Melee)(?:\.time)?$/);
        if (!matches) {
            return;
        }

        if (!(key in this.referencesToCheck)) {
            return;
        }

        const source = matches[1];
        const variant = matches[2];
        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'items');
            if (!name || !(name in this.data)) {
                continue;
            }

            const data = this.data[name];
            const costTimeKey = `cost${variant}.time`;
            const accuracyKey = `accuracy${variant}`;
            const tuKey = `tu${variant}`;

            // 'items.costAimed.time': this.checkCostAndAccuracy,
            // 'items.tuAimed': this.checkCostAndAccuracy,
            // 'items.accuracyAimed': this.checkCostAndAccuracy,
            const hasTimeunitCost = (costTimeKey in data && data[costTimeKey] > 0) || (tuKey in data && data[tuKey] > 0);
            const accuracy = (accuracyKey in data && data[accuracyKey] > 0) ? data[accuracyKey] : undefined;

            if (source !== 'accuracy' && costTimeKey in data && tuKey in data) {
                this.addDiagnosticForReference(ref, `cost${variant}.time and tu${variant} should not both be set!`);
            }
            // could be an else
            if (hasTimeunitCost && !accuracy) {
                this.addDiagnosticForReference(ref, `if there's a TU cost for ${variant}, there should be an accuracy setting!`);
            }
            if (source == 'accuracy' && accuracy && !hasTimeunitCost) {
                this.addDiagnosticForReference(ref, `if accuracy is set, there should be a TU cost (cost${variant}.time or tu${variant})!`);
            }
       }
    }
    private checkAutoShots (key: string) {
        if (!(key in this.referencesToCheck)) {
            return;
        }

        for (const ref of this.referencesToCheck[key]) {
            const name = this.getNameFromMetadata(ref.ref, 'items');
            if (!name || !(name in this.data) && !('confAuto.shots' in this.data[name]) || !('autoShots' in this.data[name])) {
                continue;
            }

            this.addDiagnosticForReference(
                ref,
                `autoShots and confAuto.shots should not both be set!`,
            );
       }
    }
}