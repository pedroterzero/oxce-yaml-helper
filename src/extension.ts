'use strict';

import { commands, ExtensionContext, languages, OutputChannel, Progress, ProgressLocation, Uri, window, workspace } from 'vscode';
import { TelemetryReporter } from '@vscode/extension-telemetry';
import { RulesetResolver } from './rulesetResolver';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { ExtensionRecommender } from './extensionRecommender';
import { RulesetHoverProvider } from './rulesetHoverProvider';
import { ConfigurationWatcher } from './configurationWatcher';
import { RulesetCompletionProvider } from './rulesetCompletionProvider';
import { ConvertCsvCommand } from './commands/convertCsvCommand';
import { ConvertCsvToRulCommand } from './commands/convertCsvToRulCommand';
import { AutoOrderWeaponsCommand } from './commands/autoOrderWeaponsCommand';
import { GenerateDocumentationCommand } from './commands/generateDocumentationCommand';
import { perfTimer } from './performanceTimer';

export const rulesetResolver = new RulesetResolver();
export let reporter: TelemetryReporter;

const createBenchmarkDefaultUri = () => {
    const workspaceFolder = workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return;
    }

    const sanitizedName = workspaceFolder.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return Uri.joinPath(workspaceFolder.uri, `benchmark-${sanitizedName}-${timestamp}.json`);
};

const saveBenchmarkReport = async (
    report: ReturnType<typeof perfTimer.report>,
    outputChannel: OutputChannel,
) => {
    const targetUri = await window.showSaveDialog({
        defaultUri: createBenchmarkDefaultUri(),
        filters: {
            JSON: ['json'],
        },
        saveLabel: 'Save benchmark report',
    });

    if (!targetUri) {
        outputChannel.appendLine('Benchmark report was not saved to a file.');
        return;
    }

    await workspace.fs.writeFile(targetUri, new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`));
    outputChannel.appendLine(`Saved benchmark report to ${targetUri.fsPath}`);
};

const loadWithProgress = () => {
    window.withProgress({
        location: ProgressLocation.Notification,
        title: 'Loading rulesets',
    }, (progress: Progress<{ message?: string; increment?: number }>) => rulesetResolver.load(progress));
};

export function activate(context: ExtensionContext) {
    // create telemetry reporter on extension activation
    reporter = new TelemetryReporter(
        'InstrumentationKey=7c49b0fd-9f4b-4441-97b3-1923c783e380;IngestionEndpoint=https://westeurope-4.in.applicationinsights.azure.com/'
    );

    reporter.sendTelemetryEvent('activated', { 'date': (new Date()).toISOString()});

    // ensure it gets properly disposed. Upon disposal the events will be flushed
    context.subscriptions.push(reporter);

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

    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.generateDocumentation', GenerateDocumentationCommand.handler));

    context.subscriptions.push(commands.registerCommand('oxcYamlHelper.benchmark', async () => {
        const outputChannel = window.createOutputChannel('OXC Benchmark');
        outputChannel.show();
        outputChannel.appendLine('Running benchmark - reloading rulesets...');
        perfTimer.reset();
        await window.withProgress({
            location: ProgressLocation.Notification,
            title: 'Running benchmark',
        }, async (progress) => {
            await rulesetResolver.load(progress);
            const report = perfTimer.report();
            outputChannel.appendLine(JSON.stringify(report, null, 2));
            await saveBenchmarkReport(report, outputChannel);
            outputChannel.appendLine('\nBenchmark complete.');
            perfTimer.logReport();
        });
    }));

    if (workspace.getConfiguration('oxcYamlHelper').get<boolean>('showRulesetDocumentationOnStartup')) {
        commands.executeCommand('oxcYamlHelper.generateDocumentation');
    }

    // load the recommender
    new ExtensionRecommender;
    // and config watcher
    new ConfigurationWatcher;
}
