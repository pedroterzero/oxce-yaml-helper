import { marked } from "marked";
import { commands, ViewColumn, window, workspace } from "vscode";
import * as docdata from '../assets/doc.json';

const HIDE_ATTRIBUTES = 1;
const SORT_ALPHABETICALLY = 2;

export class GenerateDocumentationCommand {
    public static handler() {
        const showOnStartup = workspace.getConfiguration('oxcYamlHelper').get<boolean>('showRulesetDocumentationOnStartup');
        const hideAttributes = (workspace.getConfiguration('oxcYamlHelper').get<number>('rulesetDocumentationSettings') ?? 0) & HIDE_ATTRIBUTES;
        const sortAlphabetically = (workspace.getConfiguration('oxcYamlHelper').get<number>('rulesetDocumentationSettings') ?? 0) & SORT_ALPHABETICALLY;

        let useData = docdata;
        if (sortAlphabetically) {
            useData = JSON.parse(JSON.stringify(docdata, (_key, value) => {
                if (typeof value === 'object' && value !== null) {
                    return Object.keys(value).sort().reduce((obj: {[key: string]: string}, key) => {
                        obj[key] = value[key];
                        return obj;
                    }, {});
                }
                return value;
            }));
        }

        const html =
        `<!DOCTYPE html>
        <html>
        <head>
        <title>JSON to HTML</title>
        <style>
        #toc ul {
            list-style-type: none;
        }
        #toc ul.l1 {
            list-style-type: none;
            padding-left: 0;
        }
        </style>
        </head>
        <body>
        <h1>Ruleset documentation</h1>
        <div><label><input type="checkbox" id="showOnStartup"${showOnStartup ? ` checked="checked"` : ''} /> Open documentation on startup</label></div>
        <div><label><input type="checkbox" id="hideAttributes"${hideAttributes ? ` checked="checked"` : ''} /> Hide attributes in table of contents</label></div>
        <div><label><input type="checkbox" id="sortAlphabetically"${sortAlphabetically ? ` checked="checked"` : ''} /> Sort items alphabetically (default is as it's on the wiki)</label></div>
        <h2>Table of Contents</h2>
        <div id="toc">
        ${GenerateDocumentationCommand.recursivelyReadJSONToc(useData, 0, [])}
        </div>
        <div id="doc">
        ${GenerateDocumentationCommand.recursivelyReadJSON(useData, 0, [])}
        </div>

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

                const hideAttributes = document.getElementById('hideAttributes');
                hideAttributesHandler = (() => {
                    vscode.postMessage({
                        command: 'hideAttributes',
                        value: hideAttributes.checked
                    });

                    const toc = document.getElementById('toc');
                    for (const l1 of toc.getElementsByClassName('li1')) {
                        console.log('l1', l1);

                        const l2s = l1.getElementsByClassName('l2');
                        const l3s = l1.getElementsByClassName('l3');

                        let toChange = l2s;
                        if (l3s.length > 0) {
                            toChange = l3s;
                        }

                        for (const l of toChange) {
                            l.style.display = hideAttributes.checked ? 'none' : 'block';
                        }
                    }
                });

                hideAttributes.addEventListener('click', hideAttributesHandler);
                hideAttributesHandler();

                const sortAlphabetically = document.getElementById('sortAlphabetically');
                sortAlphabetically.addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'sortAlphabetically',
                        value: sortAlphabetically.checked
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
                    case 'hideAttributes':
                        // eslint-disable-next-line no-case-declarations
                        const val1 = workspace.getConfiguration('oxcYamlHelper').get<number>('rulesetDocumentationSettings') ?? 0;
                        workspace.getConfiguration('oxcYamlHelper').update('rulesetDocumentationSettings', message.value ? val1 | HIDE_ATTRIBUTES : val1 & ~HIDE_ATTRIBUTES);
                        return;
                    case 'sortAlphabetically':
                        // eslint-disable-next-line no-case-declarations
                        const val2 = workspace.getConfiguration('oxcYamlHelper').get<number>('rulesetDocumentationSettings') ?? 0;
                        workspace.getConfiguration('oxcYamlHelper').update('rulesetDocumentationSettings', message.value ? val2 | SORT_ALPHABETICALLY : val2 & ~SORT_ALPHABETICALLY);
                        panel.dispose();
                        setTimeout(() => {
                            commands.executeCommand('oxcYamlHelper.generateDocumentation');
                        }, 100);
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
        let html = `<ul class="l${level + 1}">`;

        let added = false;
        const recurse = (key: string, level: number, path: string[]) => {
            html += `<li class="li${level + 1}"><a href="#${path.join('.')}">${key}</a>`;
            html += GenerateDocumentationCommand.recursivelyReadJSONToc(json[key], level + 1, path);
            html += '</li>';
        };

        if (typeof json == "object") {
            // html += `<div style="margin-left: ${level * 20}px;">`;
            for (const key in json) {
                if ([0, 1].includes(level)) {
                    added = true;
                    recurse(key, level, [...path, key]);
                } else if (level > 1 && 'description' in json && 'default' in json) {
                    // html += `${marked.parse(json.description)}<br />Default: ${json.default}`;
                    break;
                } else {
                    added = true;
                    recurse(key, level, [...path, key]);
                }
            }
            // html += `</div>`;
        } else {
            if (json.length > 0 ) {
                added = true;
                html += `${json}`;
            }
        }

        if (!added) {
            return '';
        }

        html += '</ul>';

        return html;
    }
}