import { existsSync } from "fs-extra";
import { basename, dirname } from "path";
import { Uri, window } from "vscode";
import { CsvToYamlConverter } from "../csvToYamlConverter";
import { logger } from "../logger";

export class ConvertCsvToRulCommand {
    public static async handler(file?: Uri) {
        let targetFile = file?.fsPath;
        if (!targetFile && window.activeTextEditor) {
            targetFile = window.activeTextEditor.document.fileName;
        }
        if (!targetFile) {
            return;
        }

        logger.debug(`Converting ${targetFile} to rul`);
        const matches = basename(targetFile).match(/^(.+?)-([a-zA-Z]+)\.csv$/);
        if (!matches) {
            window.showErrorMessage(`Could not find matching ruleset file for ${basename(targetFile)}`);
            return;
        }

        const outFile = Uri.joinPath(Uri.file(dirname(targetFile)), `${matches[1]}.rul`);
        if (!existsSync(outFile.fsPath)) {
            window.showErrorMessage(`Could not find expected ruleset file ${outFile}`);
            return;
        }

        const converter = new CsvToYamlConverter(targetFile, outFile.fsPath, matches[2]);
        converter.convert();

        logger.info('Done converting');
    }
}