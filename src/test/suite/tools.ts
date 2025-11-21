import { EndOfLine, window, workspace } from "vscode";
import { rulesetResolver } from "../../extension";
import { RulesetResolver } from "../../rulesetResolver";

export const switchLineEndings = async (filepath: string, ending: 'LF' | 'CRLF') => {
    const document = await workspace.openTextDocument(filepath);
    const editor = await window.showTextDocument(document);
    await editor.edit(builder => { builder.setEndOfLine(ending === 'LF' ? EndOfLine.LF : EndOfLine.CRLF); });
    // save and wait for refresh so we check both CRLF=>LF and vice versa
    await document.save();
    await waitForRefresh(rulesetResolver);
};

export const waitForExtensionLoad = (rulesetResolver: RulesetResolver): Promise<void> => {
    return new Promise(resolve => {
        const interval = setInterval(() => {
            if (rulesetResolver.isLoaded()) {
                clearInterval(interval);
                resolve();
            }
        }, 10);
    });
};

export const waitForRefresh = async (rulesetResolver: RulesetResolver): Promise<void> => {
    let refreshed = false;
    const wait = () => {
        refreshed = true;
    };

    rulesetResolver.onDidRefresh(wait);

    await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
            if (refreshed) {
                clearInterval(interval);
                resolve();
            }
        }, 10);
    });

    rulesetResolver.removeOnDidRefresh(wait);
};
