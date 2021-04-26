'use strict';

import { ExtensionContext, languages, Progress, ProgressLocation, window, workspace } from 'vscode';
import { RulesetResolver } from './rulesetResolver';
import { RulesetDefinitionProvider } from './rulesetDefinitionProvider';
import { ExtensionRecommender } from './extensionRecommender';
import { RulesetHoverProvider } from './rulesetHoverProvider';
import { ConfigurationWatcher } from './configurationWatcher';
import { RulesetCompletionProvider } from './rulesetCompletionProvider';
import { join as pathJoin } from 'path';
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

export const rulesetResolver = new RulesetResolver();

let client: LanguageClient;

function loadWithProgress(): void{
    window.withProgress({
        location: ProgressLocation.Notification,
        title: 'Loading rulesets',
    }, (progress: Progress<{ message?: string; increment?: number }>) => rulesetResolver.load(progress));
}

const loadLanguageServer = (context: ExtensionContext) => {
    // y-script language server
	const serverModule = context.asAbsolutePath(
		pathJoin('server', 'out', 'server.js')
	);

    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		// documentSelector: [{ scheme: 'file', language: 'html1' }]
		// documentSelector: [{ scheme: 'file', language: 'yaml' }],
		documentSelector: [{ scheme: 'file', language: 'yaml', pattern: '**/*.rul' }],
		synchronize: {
			// Notify the server about file changes to '.clientrc files contained in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: debugOptions
		}
    };

    // Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
};

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


    loadLanguageServer(context);

    // load the recommender
    new ExtensionRecommender;
    // and config watcher
    new ConfigurationWatcher;
}

export function deactivate() {
	if (!client) {
		return undefined;
	}

    return client.stop();
}
