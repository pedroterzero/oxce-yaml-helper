import { typedProperties } from "./typedProperties";
import { Definition, Match } from "./rulesetTree";
// import { logger } from "./logger";

export class RulesetDefinitionFinder {
    public getDefinitionsFromReferences(references: Match[] | undefined): Definition[] {
        if (!references) {
            return [];
        }

        const definitions: Definition[] = [];
        for (const ref of references) {
            let type = ref.path.split('.').slice(0, -1).join('.');
            const key = ref.path.split('.').slice(-1)[0];

            if (!typedProperties.isDefinitionPropertyForPath(type, key, ref.key)) {
                continue;
            }

            // TODO: figure out a proper generic way to do this
            if (ref.path === 'extraSprites.Projectiles.files') {
                this.addSpritesheetIndexes(ref, references, 'Projectiles', 35);
            }

            const fixIndexes = ['BIGOBS.PCK', 'FLOOROB.PCK', 'HANDOB.PCK', 'INTICON.PCK'];
            for (const index of fixIndexes) {
                if (ref.path === `extraSprites.${index}.files`) {
                    this.addSpritesheetIndexes(ref, references, index);
                }
            }

            // console.log(`definition ${ref.path} ${ref.key}`);
            if (typedProperties.isKeyDefinitionType(ref.path) || typedProperties.isArrayDefinitionTypes(ref.path)) {
                // restore stripped key from type
                type = ref.path;
            }

            if (!ref.rangePosition) {
                throw new Error(`No rangePosition found for ${ref}`);
            }

            const definition: Definition = {
                // I am not sure about this, but this is the way it seems to work now
                type,
                name: ref.key,
                range: ref.range,
                rangePosition: ref.rangePosition,
            };

            if ('metadata' in ref) {
                definition.metadata = ref.metadata;
            }

            // console.debug(`def: ${definition.name} (${definition.type})`);
            definitions.push(definition);
        }

        return definitions;
    }

    private addSpritesheetIndexes(ref: Match, references: Match[], _description: string, multiplier = 1) {
        if (!('metadata' in ref) || !ref.metadata) {
            return;
        }

        if (!((ref.metadata.height && ref.metadata.subY) || (ref.metadata.width && ref.metadata.subX))) {
            return;
        }

        let xLoops = 1;
        let yLoops = 1;
        if (ref.metadata.height && ref.metadata.subY) {
            const height = parseInt(ref.metadata.height as string);
            const subY = parseInt(ref.metadata.subY as string);

            if (height < subY || height % subY !== 0) {
                return;
            }

            yLoops = height / subY;
        }
        if (ref.metadata.width && ref.metadata.subX) {
            const width = parseInt(ref.metadata.width as string);
            const subX = parseInt(ref.metadata.subX as string);

            if (width < subX || width % subX !== 0) {
                return;
            }

            xLoops = width / subX;
        }

        for (let i = 1; i < (xLoops * yLoops); i++) {
            const newRef = Object.assign({}, ref, {
                key: ref.key + (i * multiplier)
            });

            // prevent infinite loop, remove subX/subY from copied metadata
            if (newRef.metadata) {
                ['width', 'height', 'subX', 'subY'].forEach(key => {
                    if (newRef.metadata && newRef.metadata[key]) {
                        // newRef.metadata[`_${key}`] = newRef.metadata[key];
                        delete newRef.metadata[key];
                    }
                });

                newRef.metadata.spriteSize = yLoops * xLoops;
            }
            // logger.debug(`adding ${description} ref key ${newRef.key}`);

            references.push(newRef);
        }
    }
}

export const rulesetDefinitionFinder = new RulesetDefinitionFinder();
