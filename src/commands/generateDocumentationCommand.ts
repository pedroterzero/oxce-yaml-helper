import { marked } from "marked";
import { ViewColumn, window, workspace } from "vscode";
import * as docdata from '../assets/doc.json';

export class GenerateDocumentationCommand {
    public static handler() {
        const showOnStartup = workspace.getConfiguration('oxcYamlHelper').get<boolean>('showRulesetDocumentationOnStartup');

        const html =
        `<!DOCTYPE html>
        <html>
        <head>
        <title>JSON to HTML</title>
        </head>
        <body>
        <h1>Ruleset documentation</h1>
        <div><label><input type="checkbox" id="showOnStartup"${showOnStartup ? ` checked="checked"` : ''} /> Open documentation on startup</label></div>
        <h2>Table of Contents</h2>
        ${GenerateDocumentationCommand.recursivelyReadJSONToc(docdata, 0, [])}
        ${GenerateDocumentationCommand.recursivelyReadJSON(docdata, 0, [])}

        <script>
            (function() {
                const vscode = acquireVsCodeApi();

                const showOnStartup = document.getElementById('showOnStartup');
                showOnStartup.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'showOnStartup',
                        value: showOnStartup.checked
                    });
                });
            }())
        </script>

        </body>
        </html>`;

        const panel = window.createWebviewPanel(
            'rulesetDocumentation',
            'Ruleset Documentation',
            ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                enableFindWidget: true,
            }
        );

        panel.webview.html = html;

        // handle messages from the webview
        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'showOnStartup':
                        workspace.getConfiguration('oxcYamlHelper').update('showRulesetDocumentationOnStartup', message.value);
                        return;
                }
            },
            // undefined,
            // GenerateDocumentationCommand.context
        );
    }

    private static recursivelyReadJSON(json: any, level: number, path: string[]): string {
        let html = "";

        const recurse = (key: string, level: number, path: string[]) => {
            html += `<h${level + 2} id="${path.join('.')}">${key}</h${level + 1}>`;
            html += GenerateDocumentationCommand.recursivelyReadJSON(json[key], level + 1, path);
        };

        if (typeof json == "object") {
            html += `<div style="margin-left: ${level * 20}px;">`;
            for (const key in json) {
                if ([0, 1].includes(level)) {
                    recurse(key, level, [...path, key]);
                } else if (level > 1 && 'description' in json && 'default' in json) {
                    html += `${marked.parse(json.description)}<br />Default: ${json.default}`;
                    break;
                } else {
                    recurse(key, level, [...path, key]);
                }
            }
            html += `</div>`;
        } else {
            html += `${json}`;
        }
        return html;
    }

    private static recursivelyReadJSONToc(json: any, level: number, path: string[]): string {
        let html = '';

        const recurse = (key: string, level: number, path: string[]) => {
            html += `<a href="#${path.join('.')}">${key}</a>`;
            html += GenerateDocumentationCommand.recursivelyReadJSONToc(json[key], level + 1, path);
        };

        if (typeof json == "object") {
            html += `<div style="margin-left: ${level * 20}px;">`;
            for (const key in json) {
                if ([0, 1].includes(level)) {
                    recurse(key, level, [...path, key]);
                } else if (level > 1 && 'description' in json && 'default' in json) {
                    // html += `${marked.parse(json.description)}<br />Default: ${json.default}`;
                    break;
                } else {
                    recurse(key, level, [...path, key]);
                }
            }
            html += `</div>`;
        } else {
            html += `${json}`;
        }

        return html;
    }
}