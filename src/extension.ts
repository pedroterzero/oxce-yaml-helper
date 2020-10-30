'use strict';

import * as vscode from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { workspace } from 'vscode';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';

export let rulesetResolver = new RulesetResolver();

function loadWithProgress(): void{
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: "Loading rulesets.."
    }, () => rulesetResolver.load());
}

export function activate(context: vscode.ExtensionContext) {
    loadWithProgress();
    context.subscriptions.push(rulesetResolver);
    context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(e => loadWithProgress()));

    const fileTypes = ['yaml'];
    const documentFilters = fileTypes.map(fileType => ({ language: fileType, scheme: 'file' }));

    context.subscriptions.push(vscode.languages.registerDefinitionProvider(documentFilters, new RulesetDefinitionProvider()));
}
