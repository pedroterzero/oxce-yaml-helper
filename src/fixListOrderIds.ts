import { promises as fsp, writeFileSync } from 'fs';
import { Uri } from "vscode";
import { parseDocument } from "yaml";

// remove in node 14
const { readFile } = fsp;


export const fixListOrderIds = async (file: Uri, startListOrderId?: number) => {
    const yaml = await readFile(file.fsPath);
    const doc = parseDocument(yaml.toString());

    const ammos: {[key: string]: string[]} =  {};
    const ammosByWeapon: {[key: string]: string[]} =  {};

    for (const item of doc.get('items').items) {
        console.log(`item.type: ${item.get('type')}`);
        const ammo = item.get('ammo');
        if (ammo) {
            for (const ammoTypes of ammo.items) {
                const compatibleAmmo = ammoTypes.value.get('compatibleAmmo');
                if (!compatibleAmmo) {
                    continue;
                }

                for (const ammo of compatibleAmmo.toJSON()) {
                    if (!(ammo in ammos)) {
                        ammos[ammo] = [];
                    }
                    if (!(item.get('type') in ammosByWeapon)) {
                        ammosByWeapon[item.get('type')] = [];
                    }

                    ammos[ammo].push(item.get('type'));
                    ammosByWeapon[item.get('type')].push(ammo);
                }

                console.log('`---', compatibleAmmo.toJSON());
                // for (const ammoType of ammoTypes.value.items) {
                //     // const compatibleAmmo = ammoType.get('compatibleAmmo');
                //     console.log('`---', ammoType.toJSON());
                // }
            }
        } else if (item.get('compatibleAmmo')) {
            for (const ammo of item.get('compatibleAmmo').toJSON()) {
                if (!(ammo in ammos)) {
                    ammos[ammo] = [];
                }
                if (!(item.get('type') in ammosByWeapon)) {
                    ammosByWeapon[item.get('type')] = [];
                }

                ammos[ammo].push(item.get('type'));
                ammosByWeapon[item.get('type')].push(ammo);
            }
        }

        // console.log(item.get('type'), item.get('ammo').toString());
    }

    // for (const )

    const orderedAmmos = Object.keys(ammos).sort().reduce((obj, key) => {
          obj[key] = ammos[key];
          return obj;
    }, {} as typeof ammos);

    const byWeapon: typeof ammos = {};
    for (const ammo in orderedAmmos) {
        for (const weapon of orderedAmmos[ammo]) {
            if (!(weapon in byWeapon)) {
                byWeapon[weapon] = [];
            }

            byWeapon[weapon].push(ammo);
        }

    }

    // const withIds: {[key: string]: {type: string, id: number}[]} = {};

    // for (const weapon in byWeapon) {
    //     for (const ammo of byWeapon[weapon]) {
    //         if (!(weapon in withIds)) {
    //             withIds[weapon] = [];
    //         }


    //     }
    // }

    const ids: {type: 'weapon'  | 'ammo', id: string, order: number}[] = [];
    let curId = startListOrderId ?? 1000;
    for (const weapon in byWeapon) {
        ids.push({
            type: 'weapon',
            id: weapon,
            order: curId
        });
        curId += 10;

        for (const ammo of byWeapon[weapon]) {
            ids.push({
                type: 'ammo',
                id: ammo,
                order: curId
            });

            curId += 10;
        }
    }

    const maxIds: {[key: string]: number} = {};
    for (const row of ids) {
        if (row.type === 'ammo') {
            if (!(row.id in maxIds)) {
                maxIds[row.id] = 0;
            }

            if (row.order > maxIds[row.id]) {
                maxIds[row.id] = row.order;
            }
        }
    }

    const cleanedIds: typeof ids = [];
    for (const key in ids) {
        const row = ids[key];
        if (row.type === 'ammo') {
            // if (row.order < maxIds[row.id]) {
            //     delete ids[key];
            // }
            if (row.order >= maxIds[row.id]) {
                cleanedIds.push(row);
            }
        } else {
            cleanedIds.push(row);
        }
    }
    console.log(ids);
    // console.log(JSON.stringify(ammos, undefined, 4));

    for (const row of cleanedIds) {
        for (const item of doc.get('items').items) {
            if (item.get('type') === row.id) {
                item.set('listOrder', row.order);
            }
        }
    }

    console.log(`writing to ${file.fsPath}`);
    writeFileSync(file.fsPath, doc.toString());


    // writeFileSync('/home/peter/vmshare/oxce/user/mods/UNEXCOM/Ruleset/csv/byAmmo.yml', stringify(orderedAmmos));
    // writeFileSync('/home/peter/vmshare/oxce/user/mods/UNEXCOM/Ruleset/csv/byWeapon.yml', stringify(byWeapon));
    // writeFileSync('/home/peter/vmshare/oxce/user/mods/UNEXCOM/Ruleset/csv/ids.yml', stringify(cleanedIds.map(obj => {
    //     return {type: obj.id, listOrder: obj.order};
    // })));

    // console.log(stringify(ammos));
    // console.log(stringify(ammosByWeapon));
    // console.log(maxIds);
    // console.log(doc.get('items'));
};
