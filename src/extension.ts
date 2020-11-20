'use strict';

import { ExtensionContext, languages, Progress, ProgressLocation, window, workspace } from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { ExtensionRecommender } from './extensionRecommender';
import { RulesetHoverProvider } from './rulesetHoverProvider';
import { ConfigurationWatcher } from './configurationWatcher';

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

    // load the recommender
    new ExtensionRecommender;
    // and config watcher
    new ConfigurationWatcher;
}
