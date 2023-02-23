import { existsSync, promises as fsp } from 'fs';
// remove in node 14
const { readFile } = fsp;
import { basename } from "path";
import { commands, ConfigurationTarget, Uri, window, workspace } from "vscode";
import { parse } from "yaml";
import { logger } from "../logger";
import { YamlToCsvConverter } from "../yamlToCsvConverter";

export class ConvertCsvCommand {
    public static async handler(file?: Uri) {

        let targetFile = file?.fsPath;
        if (!targetFile && window.activeTextEditor) {
            targetFile = window.activeTextEditor.document.fileName;
        }
        if (!targetFile) {
            return;
        }

        const type = await ConvertCsvCommand.getRulesetType(targetFile);

        if (!type) {
            // aborted
            return;
        }

        logger.debug(`Converting ${targetFile} (type: ${type}) to CSV`);

        const outFile = targetFile.replace(/\.rul$/, `-${type}.csv`);
        let doConvert = true;
        if (existsSync(outFile)) {
            const editExisting = 'Edit existing CSV file';
            const action = await window.showQuickPick([editExisting, 'Overwrite from .rul'], { placeHolder: `${basename(outFile)} exists. Do you want to overwrite it, or edit the existing file?` });
            if (action === undefined) {
                return;
            } else if (action === editExisting) {
                doConvert = false;
            }
        }

        if (doConvert) {
            const converter = new YamlToCsvConverter(targetFile, outFile, type);
            await converter.convert();
        }

        console.log(`opening ${outFile}`);
        const document = await workspace.openTextDocument(outFile);
        await window.showTextDocument(document);

        await workspace.getConfiguration('csv-edit').update('readOption_hasHeader', 'true', ConfigurationTarget.Workspace);
        await commands.executeCommand('edit-csv.edit');
    }

    private static async getRulesetType(targetFile: string) {
        if (!existsSync(targetFile)) {
            throw new Error(`${targetFile} not found`);
        }

        const doc = await readFile(targetFile);
        const parsed = parse(doc.toString(), {maxAliasCount: 4096});

        const types = Object.keys(parsed).filter(type => type !== 'extended');

        if (types.length === 1) {
            return types.shift();
        } else {
            return await window.showQuickPick(types, { placeHolder: `Which ruleset type do you want to export (${types.length} in file)` });
        }
    }
}