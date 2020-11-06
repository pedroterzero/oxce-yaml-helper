'use strict';

import { ExtensionContext, languages, Progress, ProgressLocation, window, workspace } from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { ExtensionRecommender } from './extensionRecommender';

export const rulesetResolver = new RulesetResolver();

function loadWithProgress(): void{
    window.withProgress({
        location: ProgressLocation.Window,
        title: "Loading rulesets"
    }, (progress: Progress<{ message?: string; increment?: number }>) => rulesetResolver.load(progress));
}

export function activate(context: ExtensionContext) {
    loadWithProgress();
    context.subscriptions.push(rulesetResolver);
    context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(() => loadWithProgress()));

    const fileTypes = ['yaml'];
    const documentFilters = fileTypes.map(fileType => ({ language: fileType, scheme: 'file' }));

    context.subscriptions.push(languages.registerDefinitionProvider(documentFilters, new RulesetDefinitionProvider()));

    // load the recommender
    new ExtensionRecommender;
}
