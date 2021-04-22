import { existsSync, promises as fsp } from 'fs';
// remove in node 14
const { readFile, writeFile } = fsp;
import { parse as csvParse } from "papaparse";
import { Document, parseDocument } from "yaml";
import * as dot from 'dot-object';
import { window } from "vscode";
import { typedProperties } from "./typedProperties";
import { logger } from "./logger";
import { Collection } from "yaml/types";
import { Type } from "yaml/util";
import { cleanObject } from 'tiny-clean-object';

export class CsvToYamlConverter {
    private doc: Document.Parsed | undefined;
    private ids: {[key: string]: boolean} = {};
    private matches: {[key: string]: number} = {};

    public constructor(private inFile: string, private outFile: string, private type: string) {
    }

    public async convert() {
        await this.parseRuleset();
        if (!this.doc) {
            return;
        }

        const input = csvParse((await readFile(this.inFile)).toString(), {header: true, dynamicTyping: true});
        if (input.errors.length > 0) {
            window.showErrorMessage(`Could not parse CSV file`);
            return;
        }


        for (const row of input.data) {
            const parsed = this.undot(row);

            this.merge(parsed);
        }

        this.handleDeletes();

        writeFile(this.outFile, this.doc.toString());
    }

    private undot(row: any) {
        const out: typeof row = {};

        for (const key in row) {
            if (key.slice(-2) === '[]') {
                if (typeof row[key] === 'string') {
                    const parts = row[key].split(',');
                    for (let i = 0; i < parts.length; i++) {
                        // keep ints as ints
                        let val = parts[i];
                        if (parseInt(val).toString() === val) {
                            val = parseInt(val);
                        }

                        out[`${key.slice(0, -2)}[${i}]`] = val;
                    }
                } else {
                    out[`${key.slice(0, -2)}`] = [];
                }

                continue;
            }

            out[key] = row[key];
        }

        return dot.object(out);
    }

    private async parseRuleset() {
        if (!existsSync(this.outFile)) {
            throw new Error(`${this.outFile} not found`);
        }

        const doc = await readFile(this.outFile);
        this.doc = parseDocument(doc.toString());
    }

    private merge(row: any) {
        const entry = this.findEntry(row);

        if (!entry) {
            if (!this.doc) {
                throw Error('No YAML document');
                return;
            }

            // whole new entry
            this.doc.addIn([this.type], row);

            // re-read doc so the node we just added is not just a 'POJO'
            // in case of performance problems we could also handle adds at the end (before deletes)
            // because that's why we had to do this
            this.doc = parseDocument(this.doc.toString());
            return;
        }

        this.mergeSub(entry, row);
    }

    private mergeSub (entry: Collection, row: any) {
        for (const key of Object.keys(row)) {
            let keyToUse: string | number = key;
            if (parseInt(key).toString() === key) {
                keyToUse = parseInt(key);
            }

            const currentValue = entry.get(keyToUse);
            const newValue = row[keyToUse];

            // if (currentValue && typeof currentValue === 'object' && 'items' in currentValue) {
            if (currentValue && typeof currentValue === 'object') {
                // add stuff recursively, or if nothing remains, delete the key
                if ([Type.FLOW_MAP, Type.MAP].includes(currentValue.type)) {
                    this.mergeSub(currentValue, newValue);

                    if (currentValue.items.length === 0) {
                        // nothing remaining? delete it
                        entry.delete(keyToUse);
                    }

                    continue;
                }
            }

            if (!currentValue && newValue && typeof newValue === 'object' && !Array.isArray(newValue)) {
                // if an object is added in, that does not exist yet, check that it does not have only empty values - if it does, ignore it
                const objectWithoutNulls = Object.fromEntries(Object.entries(newValue).filter(([_, v]) => v !== null && !(Array.isArray(v) && v.length === 0)));
                if (Object.keys(objectWithoutNulls).length === 0) {
                    continue;
                }
            }

            if (newValue === null || (Array.isArray(newValue) && newValue.length === 0)) {
                // no value was provided, so remove it, if it exists
                entry.delete(keyToUse);
                continue;
            }

            if (['string', 'number', 'boolean'].includes(typeof currentValue)) {
                // for strings, use this way of setting, so we respect comments
                for (const item of entry.items) {
                    if (item.key.value === keyToUse) {
                        // console.log(`setting1 ${entry.toJSON().type} ${key}`);
                        item.value.value = row[keyToUse];
                    }
                }
            } else {
                // keep [] array syntax
                 if (currentValue?.type === Type.FLOW_SEQ) {
                    while (entry.get(keyToUse).items.length > 0) {
                        entry.deleteIn([keyToUse, 0]);
                    }

                    for (const value of newValue) {
                        entry.addIn([keyToUse], value);
                    }
                } else {
                    // regular set, also adds in stuff that did not have a key before
                    const cleaned = cleanObject(cleanObject(row[keyToUse], {deep: true, emptyArrays: true}), {deep: true, emptyArrays: true, emptyObjects: true});
                    if (Object.keys(cleaned).length > 0) {
                        entry.set(keyToUse, cleaned);
                    }
                }
            }
        }
    }

    private findEntry(row: any) {
        const typeKey = typedProperties.getTypeKey(row, this.type);
        if (!typeKey || !this.doc) {
            return;
        }

        const id = row[typeKey];
        this.ids[id] = true;
        const foundMatches = (this.matches[id] || 0) + 1;

        let currentMatch = 0;
        for (const entry of this.doc.get(this.type).items) {
            const entryObject = entry.toJSON();

            if (typeKey in entryObject && entryObject[typeKey] === id) {
                currentMatch++;
                // "correctly" handle duplicate ids (no idea why people want this)
                if (currentMatch >= foundMatches) {
                    this.matches[id] = currentMatch;

                    return entry;
                }
            }
        }

        logger.debug(`Could not find entry for ${this.type} ${id}`);
    }

    private handleDeletes() {
        if (!this.doc) {
            return;
        }

        let i = 0;
        for (const entry of this.doc.get(this.type).items) {
            const entryObject = entry.toJSON();
            const typeKey = typedProperties.getTypeKey(entryObject, this.type);

            if (typeKey && !(entryObject[typeKey] in this.ids)) {
                // console.log('iii', entryObject[typeKey], i, entryObject);
                this.doc.deleteIn([this.type, i]);
            }

            i++;
        }
    }
}