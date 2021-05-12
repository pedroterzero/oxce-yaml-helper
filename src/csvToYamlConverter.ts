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
    private originalFile = '';
    private doc: Document.Parsed | undefined;
    private ids: {[key: string]: boolean} = {};
    private matches: {[key: string]: number} = {};

    public constructor(private inFile: string, private outFile: string, private type: string) {
    }

    public async convert() {
        await this.parseRuleset();

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

        this.fixCommentIndents();

        writeFile(this.outFile, this.fixCommentIndents());
    }

    private fixCommentIndents () {
        if (!this.doc) {
            return '';
        }

        const output = this.doc.toString();

        let currentLineOfNewOutput = 0;
        const outputFixed = output.split("\n");
        for (const line of this.originalFile.split("\n")) {
            const cleaned = line.trimEnd();

            let matches;
            if ((matches = cleaned.match(/^#(.+)$/))) {
                console.log('old file', matches[1]);

                // find in the new output
                let lineNumber = -1;
                for (const line of outputFixed) {
                    lineNumber++;

                    if (lineNumber < currentLineOfNewOutput) {
                        continue;
                    }

                    const cleaned = line.trimEnd();
                    const regex = new RegExp(`^\\s+#${matches[1]}\\s*$`);
                    if (regex.exec(cleaned)) {
                        outputFixed[lineNumber] = `#${matches[1]}`;
                        console.log('match', matches[1]);
                        break;
                    }

                    currentLineOfNewOutput = lineNumber;
                }
            }
        }

        return outputFixed.join("\n");
    }

    private undot(row: any) {
        const out: typeof row = {};

        for (const key in row) {
            if (row[key] === null) {
                // skip null rows
                continue;
            }

            if (key.slice(-2) === '[]') {
                if (typeof row[key] === 'string') {
                    const parts = row[key].split(',');
                    for (let i = 0; i < parts.length; i++) {
                        // keep ints as ints
                        let val = parts[i];
                        if (parseInt(val).toString() === val) {
                            val = parseInt(val);
                        } else if (parseFloat(val).toString() === val) {
                            val = parseFloat(val);
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

        this.originalFile = (await readFile(this.outFile)).toString();
        this.doc = parseDocument(this.originalFile.toString());
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
                if ([Type.FLOW_MAP, Type.MAP, Type.SEQ].includes(currentValue.type)) {
                    this.mergeSub(currentValue, newValue);

                    if (currentValue.items.length === 0) {
                        // nothing remaining? delete it
                        logger.debug(`Removing ${keyToUse}`);
                        entry.delete(keyToUse);
                    }

                    continue;
                }
            }

/*          if (!currentValue && newValue && typeof newValue === 'object' && !Array.isArray(newValue)) {
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
            }*/

            if (['string', 'number', 'boolean'].includes(typeof currentValue)) {
                // for strings, use this way of setting, so we respect comments
                if (entry.type === Type.SEQ) {
                    for (const index in entry.items) {
                        if (index === key) { // use key for strict match, not keyToUse
                            entry.items[index].value = row[keyToUse];
                        }
                    }
                } else {
                    for (const item of entry.items) {
                        if (item.key.value === keyToUse) {
                            item.value.value = row[keyToUse];
                        }
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
                } else if (['object'].includes(typeof newValue)) {
                    // regular set, also adds in stuff that did not have a key before
                    const cleaned = cleanObject(cleanObject(row[keyToUse], {deep: true, emptyArrays: true}), {deep: true, emptyArrays: true, emptyObjects: true});
                    if (Object.keys(cleaned).length > 0) {
                        entry.set(keyToUse, cleaned);
                    }
                } else {
                    // regular set, also adds in stuff that did not have a key before
                    entry.set(keyToUse, newValue);
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