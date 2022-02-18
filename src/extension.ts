'use strict';

// load first
import { setup } from 'applicationinsights';

setup('InstrumentationKey=7c49b0fd-9f4b-4441-97b3-1923c783e380;IngestionEndpoint=https://westeurope-4.in.applicationinsights.azure.com/').start();

// handle the rest
import { commands, ExtensionContext, languages, Progress, ProgressLocation, window, workspace } from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { ExtensionRecommender } from './extensionRecommender';
import { RulesetHoverProvider } from './rulesetHoverProvider';
import { ConfigurationWatcher } from './configurationWatcher';
import { RulesetCompletionProvider } from './rulesetCompletionProvider';
import { ConvertCsvCommand } from './commands/convertCsvCommand';
import { ConvertCsvToRulCommand } from './commands/convertCsvToRulCommand';
import { AutoOrderWeaponsCommand } from './commands/autoOrderWeaponsCommand';

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

    const triggerCharacters = " abcdefghijklmnopqrstuvwxyz0123456789".split('');
    context.subscriptions.push(languages.registerCompletionItemProvider(documentFilters, new RulesetCompletionProvider(), ...triggerCharacters));

    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.convertCsv', ConvertCsvCommand.handler));
    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.convertCsvToRul', ConvertCsvToRulCommand.handler));

    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.autoOrderWeapons', AutoOrderWeaponsCommand.handler));

    // load the recommender
    new ExtensionRecommender;
    // and config watcher
    new ConfigurationWatcher;
}
