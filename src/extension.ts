'use strict';

import * as vscode from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { workspace } from 'vscode';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { LineEndingChecker } from './lineEndingChecker';

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
    context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(() => loadWithProgress()));

    const fileTypes = ['yaml'];
    const documentFilters = fileTypes.map(fileType => ({ language: fileType, scheme: 'file' }));

    // diagnostic
    let diagnosticCollection = vscode.languages.createDiagnosticCollection('stuff');
    let diagnostics : vscode.Diagnostic[] = [];
    let range : vscode.Range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 10));


    diagnostics.push(new vscode.Diagnostic(range, 'fix it', vscode.DiagnosticSeverity.Warning));
    diagnosticCollection.set(vscode.Uri.file('foobar'), diagnostics);
    // end

    context.subscriptions.push(vscode.languages.registerDefinitionProvider(documentFilters, new RulesetDefinitionProvider()));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(LineEndingChecker.checkActiveEditorLineEndings));
    
    LineEndingChecker.checkActiveEditorLineEndings();
}
