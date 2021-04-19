import { existsSync, promises as fsp } from 'fs';
// remove in node 14
const { readFile, writeFile } = fsp;
import { unparse } from "papaparse";
import { parse } from "yaml";
import * as dot from 'dot-object';

export class YamlToCsvConverter {
    public constructor(private inFile: string, private outFile: string, private type: string) {
    }

    public async convert() {
        const parsed = await this.parseRuleset();

        const source = (parsed[this.type] as any[]).filter(row => !row.delete);
        const sourceDot = source.map((row: any) => this.makeDotted(row));

        const csv = unparse(sourceDot as any);
        writeFile(this.outFile, csv);
    }

    private async parseRuleset() {
        if (!existsSync(this.inFile)) {
            throw new Error(`${this.inFile} not found`);
        }

        const doc = await readFile(this.inFile);
        return parse(doc.toString());
    }

    private makeDotted(row: { [key: string]: any }) {
        const dotted = dot.dot(row);

        const arrays: {[key: string]: string[]} = {};
        for (const key in dotted) {
            const matches = key.match(/^([a-zA-Z0-9.]+)\[\d+\]$/);
            if (matches) {
                const arrayKey = matches[1];
                if (!(arrayKey in arrays)) {
                    arrays[arrayKey] = [];
                }

                arrays[arrayKey].push(dotted[key]);
                delete dotted[key];
            }
        }

        for (const key in arrays) {
            dotted[key + '[]'] = arrays[key].join(',');
        }

        return dotted;
    }
}