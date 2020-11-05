import { commands, extensions, window, workspace } from "vscode";

export class ExtensionRecommender {
    private choices = {
        showIt: 'Tell me more',
        installIt: 'Install it!',
        notNow: 'Not now',
        never: 'Stop bugging me about this',
    }

    public constructor() {
        this.init();
    }
    init() {
        this.recommend(
            'kisstkondoros.vscode-gutter-preview',
            'noRecommendImagePreview',
            'Install the Image Preview extension to improve QoL even more! This enables image previews for extraSprites et cetera.'
        );
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
