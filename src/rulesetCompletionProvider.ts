import {
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    MarkdownString,
    Position,
    ProviderResult,
    TextDocument,
    WorkspaceFolder,
    workspace,
} from 'vscode';
import { KeyDetector } from './keyDetector';
// import { i18nResolver } from './extension';
import { builtinTypes } from './definitions/builtinTypes';
import { logger } from './logger';
import { rulesetTree } from './rulesetTree';
import { typedProperties } from './typedProperties';
import { DefinitionCompletion, DefinitionCompletions } from './workspaceFolderRuleset';
import { rulesetDefinitionChecker } from './rulesetDefinitionChecker';
// import { i18nTree } from './i18nTree';

export class RulesetCompletionProvider implements CompletionItemProvider {
    public provideCompletionItems(
        document: TextDocument,
        position: Position /*, _token: CancellationToken, _context: CompletionContext*/,
    ): ProviderResult<CompletionItem[]> {
        const folder = workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
            throw new Error(`Could not get workspace folder for ${document.uri}`);
        }

        if (!this.shouldComplete(position, document)) {
            // logger.debug('Not completing');
            return;
        }

        const key = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document, false);
        const path = KeyDetector.findRulePath(position, document);
        if (!path) {
            return;
        }

        logger.debug(`path is ${path}`);

        const target = typedProperties.getDefinitionTypeForReference(path);
        if (!target) {
            return;
        }

        logger.debug(`provideCompletionItems, type: ${path} key: ${key?.key}, target: ${target}`);

        // const i18nKey = KeyDetector.getI18nKeyAtRangeFromDocument(range, document);
        // let keyPrefix = i18nResolver.getDefaultLocaleKey(document.uri) + ".";
        // logger.debug('provideCompletionItems', 'range:', range, 'i18nkey', i18nKey, 'keyPrefix', keyPrefix);

        // if (KeyDetector.isRelativeKey(i18nKey)) {
        //     keyPrefix += KeyDetector.getRelativeKeyPart(document.fileName);
        // }
        const list = this.buildCompletionItemList(target, key?.key, folder, path);

        return list;

        // completionItem.detail = i18nTree.lookupKey(filteredKey, workspaceFolder);
        // return items;
    }

    /**
     * Should autocomplete be triggered? Rules (currently) are:
     * - should not be end of file (why?)
     * - next char should be ",", "<space>" or "]"
     * @param position
     * @param document
     * @returns
     */
    private shouldComplete(position: Position, document: TextDocument) {
        let rest = document.getText().slice(document.offsetAt(position)).replace(/\r\n/g, '\n') + '\n';
        rest = rest.slice(0, rest.indexOf('\n'));

        return rest.length === 0 || [':', ',', ' ', ']'].includes(rest.slice(0, 1));
    }

    private buildCompletionItemList(
        target: string,
        key: string | undefined,
        workspaceFolder: WorkspaceFolder,
        path: string,
    ): CompletionItem[] | undefined {
        const filteredKeys = {
            ...rulesetTree.getKeysContaining(key, target, workspaceFolder),
            ...this.getBuiltinKeys(path),
        };

        if (Object.keys(filteredKeys).length === 0) {
            return;
        }

        logger.debug(`buildCompletionItemList filteredKeys: ${Object.keys(filteredKeys).length}`);
        return this.transformFilterResultIntoCompletionItemList(filteredKeys); //, keyPrefix, i18nKey, workspaceFolder);
    }

    private getBuiltinKeys(path: string): Record<string, { detail: string }> {
        const builtinKeys: Record<string, { detail: string }> = {};
        if (path in builtinTypes) {
            builtinTypes[path].forEach((key: string) => {
                builtinKeys[key] = { detail: 'builtin' };
            });
        } else {
            const values = rulesetDefinitionChecker.matchesBuiltinTypePathRegex(path);
            values?.length &&
                values.forEach((key: string) => {
                    builtinKeys[key] = { detail: 'builtin' };
                });
        }
        return builtinKeys;
    }

    private transformFilterResultIntoCompletionItemList(
        filteredKeys: DefinitionCompletions /*, prefixToRemove: string, i18nKeyToComplete: string, workspaceFolder: WorkspaceFolder*/,
    ): CompletionItem[] {
        const ret = [];
        for (const key in filteredKeys) {
            ret.push(this.buildCompletionItem(key, filteredKeys[key]));
        }
        return ret;

        // return filteredKeys.map(filteredKey => {
        //     return this.buildCompletionItem(filteredKey);//, prefixToRemove, i18nKeyToComplete, workspaceFolder);
        // });
    }

    private buildCompletionItem(
        filteredKey: string,
        data: DefinitionCompletion /*, prefixToRemove: string, i18nKeyToComplete: string, workspaceFolder: WorkspaceFolder*/,
    ): CompletionItem {
        // remove the prefix (locale key and possibly key-part relative to current file location)
        // let relevantKey = filteredKey.substring(prefixToRemove.length);
        // use the relevant key part as label for completion item
        const completionItem = new CompletionItem(filteredKey, CompletionItemKind.Reference);
        // current word gets replaced, so we need to provide the current full keypart that is being typed
        // completionItem.insertText = filteredKey;
        // completionItem.insertText = relevantKey.substring(i18nKeyToComplete.lastIndexOf(".") + 1);
        // provide the translation as additional info
        // completionItem.detail = i18nTree.lookupKey(filteredKey, workspaceFolder);
        if ('detail' in data) {
            completionItem.documentation = new MarkdownString(data.detail);
        }

        return completionItem;
    }
}
