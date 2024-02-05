import { workspace } from 'vscode';
import { rulesetResolver } from './extension';

export class ConfigurationWatcher {
    // private choices = {
    //     yes: 'Yes',
    //     no: 'No',
    // }

    // private findDuplicateDefinitions = this.getFindDuplicateDefinitions();
    private validateCategories = this.getValidateCategories();

    public constructor() {
        this.init();
    }

    private init() {
        workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('oxcYamlHelper.findDuplicateDefinitions')) {
                // this.findDuplicateDefinitions = this.getFindDuplicateDefinitions();
                // this.requestRestart();
                rulesetResolver.refreshWorkspaceFolderRulesets();
            }
            if (event.affectsConfiguration('oxcYamlHelper.findMissingTranslations')) {
                rulesetResolver.refreshWorkspaceFolderRulesets();
            }

            if (event.affectsConfiguration('oxcYamlHelper.validateCategories')) {
                if (this.determineValidateCategoriesRefreshNeeded(this.validateCategories)) {
                    // this.requestRestart();
                    rulesetResolver.refreshWorkspaceFolderRulesets();
                }
            }
        });
    }

    private determineValidateCategoriesRefreshNeeded(oldValue: string) {
        this.validateCategories = this.getValidateCategories();

        let restart = false;
        if (!this.validateCategories) {
            restart = true;
        } else {
            if (['yes', 'always'].includes(oldValue) && this.getValidateCategories() === 'no') {
                restart = true;
            } else if (['yes', 'always'].includes(this.getValidateCategories()) && oldValue === 'no') {
                restart = true;
            }
        }
        return restart;
    }

    // private getFindDuplicateDefinitions () {
    //     return workspace.getConfiguration('oxcYamlHelper').get<boolean>('findDuplicateDefinitions');
    // }

    private getValidateCategories() {
        return workspace.getConfiguration('oxcYamlHelper').get<string>('validateCategories') || 'no';
    }

    // private requestRestart() {
    //     const message = 'A setting has been changed that requires a restart. Would you like to restart now?';

    //     window.showInformationMessage(
    //         message, this.choices.yes, this.choices.no
    //     ).then((result) => {
    //         if (result === this.choices.yes) {
    //             commands.executeCommand('workbench.action.reloadWindow');
    //         }
    //     });
    // }
}

//export const extensionRecommender = new ExtensionRecommender;
