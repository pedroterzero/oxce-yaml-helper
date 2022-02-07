import { existsSync } from "fs";
import { commands, env, extensions, Uri, window, workspace } from "vscode";
import { rulesetResolver } from "./extension";
import { rulesetTree } from "./rulesetTree";
export class ExtensionRecommender {
    private choices = {
        showIt: 'Tell me more',
        installIt: 'Install it!',
        notNow: 'Not now',
        never: 'Stop bugging me about this',
    };

    public constructor() {
        this.init();
    }

    private addOnLoadEvent() {
        rulesetResolver.onDidLoad(this.onRulesetsLoaded.bind(this));
    }

    private init() {
        this.addOnLoadEvent();

        this.recommend(
            'kisstkondoros.vscode-gutter-preview',
            'noRecommendImagePreview',
            'Install the Image Preview extension to improve QoL even more! This enables image previews for extraSprites et cetera.'
        );

        this.recommend(
            'janisdd.vscode-edit-csv',
            'noRecommendCsvEditor',
            'Install the Edit Csv extension to improve QoL even more! This enables editing rulesets as a spreadsheet.'
        );
    }

    private onRulesetsLoaded() {
        if (!window.activeTextEditor) {
            return;
        }

        const folder = workspace.getWorkspaceFolder(Uri.file(window.activeTextEditor.document.fileName));
        if (!folder) {
            return;
        }

        const variables = rulesetTree.getVariables(folder);
        if (!variables) {
            return;
        }

        if ('ftaGame' in variables && variables.ftaGame === true) {
            this.recommend(
                'openxcomfta.ruleset-tools',
                'noRecommendOpenXcomFtaRulesetTools',
                'Install the OpenXCOM FtA Ruleset Tools extension to improve QoL even more! This provides syntax validation on the rule files.'
            );

            // also recommend linker.yml
            if (!existsSync(Uri.joinPath(folder.uri, 'linker.yml').fsPath)) {
                window.showInformationMessage(
                    'To mod FtA, you will also need to download linker.yml and place it in the mod root (same folder as metadata.yml). Do you want to open the URL for it?', 'Yes', 'No'
                ).then((result) => {
                    if (result === 'Yes') {
                        env.openExternal(Uri.parse('https://raw.githubusercontent.com/723Studio/X-Com-From-the-Ashes/master/linker.yml'));
                    }
                });
            }
        } else {
            this.recommend(
                'openxcom.ruleset-tools',
                'noRecommendOpenXcomRulesetTools',
                'Install the OpenXCOM Ruleset Tools extension to improve QoL even more! This provides syntax validation on the rule files.'
            );
        }
    }

    private recommend(extension: string, noPromptSetting: string, message: string) {
        if (extensions.getExtension(extension) || workspace.getConfiguration('oxcYamlHelper').get('prompts.' + noPromptSetting)) {
            return;
        }

        window.showInformationMessage(
            message, this.choices.showIt, this.choices.installIt, this.choices.notNow, this.choices.never
        ).then((result) => {
            this.handleChoice(result, extension, noPromptSetting);
        });
    }

    private handleChoice(result: string | undefined, extension: string, noPromptSetting: string) {
        if (result === this.choices.installIt) {
            commands.executeCommand('workbench.extensions.installExtension', extension);
        } else if (result === this.choices.showIt) {
            commands.executeCommand('workbench.extensions.search', extension);
        } else if (result === this.choices.never) {
            try {
                workspace.getConfiguration('oxcYamlHelper').update('prompts.' + noPromptSetting, true);
            } catch (e) {
                console.log(e);
            }
        }
    }
}

//export const extensionRecommender = new ExtensionRecommender;
