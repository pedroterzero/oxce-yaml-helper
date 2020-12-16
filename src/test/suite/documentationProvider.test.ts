import * as assert from 'assert';
import { documentationProvider } from '../../documentationProvider';

const expectedDocumentation = [
    {
        type: 'items',
        property: 'flatRate',
        documentation: "If true, then TU costs for this weapon are a flat rate (instead of a percentage of unit TUs).\n\n**Default: false**"
    },
    {
        type: 'items',
        property: 'IgnoreDirection',
        documentation: "Should the damage calculation ignore from which direction the projectile came? Used for example for smoke or fire.\n\n**Default: false**"
    },
    {
        type: 'constants',
        property: 'extendedItemReloadCost',
        documentation: "If set to true, the item reload cost equals to \"cost of moving ammo to hand\" + \"cost of reload\".\n\n**Default: false**"
    },
    {
        type: 'ai',
        property: 'useDelayFirearm',
        documentation: "Defines a turn, from which the aliens are allowed to use firearms.\n\n**Default: 0**"
    }
];

describe("documentationProvider", () => {
    describe('getDocumentationForProperty', () => {
        it('returns the correct documentation', () => {
            for (const entry of expectedDocumentation) {
                const doc = documentationProvider.getDocumentationForProperty(entry.property, entry.type);
                assert.strictEqual(doc, entry.documentation);
            }
        });

        it('returns nothing on invalid property', () => {
            assert.strictEqual(undefined, documentationProvider.getDocumentationForProperty('bar', 'foo'));
        });
    });
});
