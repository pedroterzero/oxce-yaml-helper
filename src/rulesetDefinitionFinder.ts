import { typedProperties } from "./typedProperties";
import { Definition, Match } from "./rulesetTree";

export class RulesetDefinitionFinder {
    public getDefinitionsFromReferences(references: Match[] | undefined): Definition[] {
        if (!references) {
            return [];
        }

        const definitions: Definition[] = [];
        for (const ref of references) {
            let type = ref.path.split('.').slice(0, -1).join('.');
            const key = ref.path.split('.').slice(-1)[0];

            let extraFiles = false;
            if (type.indexOf('extraSprites.') === 0 || type.indexOf('extraSounds.') === 0) {
                // these were already 'processed', so let them through as definitons
                extraFiles = true;
                // restore full path
                type = ref.path;
            }

            if (extraFiles || typedProperties.isDefinitionPropertyForPath(type, key, ref.key)) {
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
        }

        return definitions;
    }
}

export const rulesetDefinitionFinder = new RulesetDefinitionFinder();
