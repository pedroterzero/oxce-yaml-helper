'use strict';

import { commands, ExtensionContext, languages, Progress, ProgressLocation, window, workspace } from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { ExtensionRecommender } from './extensionRecommender';
import { RulesetHoverProvider } from './rulesetHoverProvider';
import { ConfigurationWatcher } from './configurationWatcher';
import { ConvertCsvCommand } from './commands/convertCsvCommand';
import { ConvertCsvToRulCommand } from './commands/convertCsvToRulCommand';

export const rulesetResolver = new RulesetResolver();

function loadWithProgress(): void{
    window.withProgress({
        location: ProgressLocation.Notification,
        title: 'Loading rulesets',
    }, (progress: Progress<{ message?: string; increment?: number }>) => rulesetResolver.load(progress));
}

export function activate(context: ExtensionContext) {
    loadWithProgress();
    rulesetResolver.setExtensionContent(context);
    context.subscriptions.push(rulesetResolver);
    context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(() => loadWithProgress()));

    const fileTypes = ['yaml'];
    const documentFilters = fileTypes.map(fileType => ({ language: fileType, scheme: 'file' }));

    context.subscriptions.push(languages.registerDefinitionProvider(documentFilters, new RulesetDefinitionProvider()));
    context.subscriptions.push(languages.registerHoverProvider(documentFilters, new RulesetHoverProvider()));

    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.convertCsv', ConvertCsvCommand.handler));
    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.convertCsvToRul', ConvertCsvToRulCommand.handler));

    // setTimeout(() => {
        // commands.executeCommand('oxcYamlHelper.convertCsv', Uri.file('/home/peter/mods/X-Com-From-the-Ashes/Ruleset/items_FTA.rul'));
        // commands.executeCommand('oxcYamlHelper.convertCsvToRul', Uri.file('/home/peter/mods/X-Com-From-the-Ashes/Ruleset/items_FTA-items.csv'));
    // }, 10);

    // load the recommender
    new ExtensionRecommender;
    // and config watcher
    new ConfigurationWatcher;
}
