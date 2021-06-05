export const typeHintMessages: {[key: string]: (value: string) => string} = {
    'crafts.sprite': (value) => `
        this needs THREE extraSprites (see documentation by hovering over "sprite:"):
        - One in INTICON.PCK with spriteID ${value}
        - One in INTICON.PCK with spriteID ${value + 11} (${value} + 11)
        - And one in BASEBITS.PCK with spriteID ${value + 33} (${value} + 33)
    `,
    'craftWeapons.sprite': (value) => `
        this needs TWO extraSprites (see documentation by hovering over "sprite:"):
        - One in INTICON.PCK with spriteID ${value + 5} (${value} + 5)
        - And one in BASEBITS.PCK with spriteID ${value + 48} (${value} + 48)
    `,
    'items.bulletSprite': (value) => `
        this needs a sprite in Projectiles with spriteID ${parseInt(value) * 35} (${value} * 35)
        (see documentation by hovering over "bulletSprite:")
    `,
    'items.hitAnimation': () => `
        depending on damageType, this sprite should be in one of two places (see documentation by hovering over "hitAnimation:")
        - if damageType is 2, 3, 6 or 9 AND blastRadius is not 0 or damageAlter.FixRadius is not 0 - it should go in X1.PCK
        - otherwise it should go in SMOKE.PCK
    `,
    'extraSpritesMulti': (value) => `These sprites should be spaced ${value} entries apart, otherwise the wrong sprites will show up in-game`
};
