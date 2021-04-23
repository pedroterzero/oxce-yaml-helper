import { typedProperties } from "./typedProperties";
import { Definition, Match } from "./rulesetTree";
import { logger } from "./logger";

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
                this.addBulletSprites(ref, references);
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

    private addBulletSprites(ref: Match, references: Match[]) {
        if (!('metadata' in ref) || !ref.metadata || !('height' in ref.metadata) || !('subY' in ref.metadata)) {
            return;
        }

        const height = parseInt(ref.metadata.height as string);
        const subY = parseInt(ref.metadata.subY as string);


        if (height < subY || height % subY !== 0) {
            return;
        }

        for (let i = 1; i < height / subY; i++) {
            const newRef = Object.assign({}, ref, {
                key: ref.key + (i * 35)
            });
            delete newRef.metadata; // prevent infinite lolz
            logger.debug(`adding Projectiles ref key ${newRef.key}`);

            references.push(newRef);
        }
    }
}

export const rulesetDefinitionFinder = new RulesetDefinitionFinder();
