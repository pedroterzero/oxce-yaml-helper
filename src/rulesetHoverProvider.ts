import { Hover, HoverProvider, MarkdownString, Position, Range, TextDocument, workspace } from 'vscode';
import { documentationProvider } from './documentationProvider';
import { rulesetResolver } from './extension';
import { KeyDetector } from './keyDetector';
import { logger } from './logger';

export class RulesetHoverProvider implements HoverProvider {

    public provideHover(document: TextDocument, position: Position): Hover | undefined {
        const value = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document);

        const translation = KeyDetector.isValidTranslationKey(value);
        if (translation !== undefined) {
            return this.provideTranslationHover(translation);
        }

        const property = KeyDetector.isValidPropertyKey(value);
        if (property !== undefined) {
           return this.providePropertyHover(value);
        }

        return;
    }

    private provideTranslationHover(value: { key: string; range: Range | undefined; } | undefined): Hover | undefined {
        if (!value?.key) {
            return;
        }

        const text = rulesetResolver.getTranslationForKey(value.key);
        if (text) {
            logger.debug(`provideHover for ${value.key} = ${text}`);

            return new Hover(new MarkdownString(text), value.range);
        }

        return;
    }

    private providePropertyHover(value: { key: string; range: Range | undefined; } | undefined): Hover | undefined {
        if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('showDocumentationHover')) {
            return;
        }

        if (!value?.key) {
            return;
        }

        const text = documentationProvider.getDocumentationForProperty(value.key.slice(0, -1));
        if (text) {
            logger.debug(`provideHover for ${value.key.slice(0, -1)} = ${text}`);

            return new Hover(new MarkdownString(text), value.range);
        }

        return;
    }
}