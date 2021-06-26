import { Uri, window } from "vscode";
import { fixListOrderIds } from '../fixListOrderIds';
import { logger } from "../logger";

export class AutoOrderWeaponsCommand {
    public static async handler(file?: Uri) {
        let targetFile = file?.fsPath;
        if (!targetFile && window.activeTextEditor) {
            targetFile = window.activeTextEditor.document.fileName;
        }
        if (!targetFile) {
            return;
        }

        const listOrderId = await window.showInputBox({ placeHolder: 'Start listOrderId?' });

        logger.debug(`Auto ordering weapons in ${targetFile}, id ${listOrderId}`);

        await fixListOrderIds(Uri.file(targetFile), listOrderId ? +listOrderId : undefined);
    }
}