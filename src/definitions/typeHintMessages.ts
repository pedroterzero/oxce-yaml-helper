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
    `
};
