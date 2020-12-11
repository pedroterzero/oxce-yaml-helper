import { Hover, HoverProvider, MarkdownString, Position, TextDocument, workspace } from 'vscode';
import { documentationProvider } from './documentationProvider';
import { rulesetResolver } from './extension';
import { KeyDetector, KeyMatch } from './keyDetector';
import { logger } from './logger';

export class RulesetHoverProvider implements HoverProvider {

    public provideHover(document: TextDocument, position: Position): Hover | undefined {
        const value = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document, true);

        const translation = KeyDetector.isValidTranslationKey(value);
        if (translation !== undefined) {
            return this.provideTranslationHover(translation);
        }

        const property = KeyDetector.isValidPropertyKey(value);
        if (property !== undefined) {
            property.type = KeyDetector.findRuleType(position, document);

            return this.providePropertyHover(property);
        }

        return;
    }

    private provideTranslationHover(value: KeyMatch | undefined): Hover | undefined {
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

    private providePropertyHover(value: KeyMatch | undefined): Hover | undefined {
        if (workspace.getConfiguration('oxcYamlHelper').get<string>('showDocumentationHover') === 'no') {
            return;
        }

        if (!value?.key) {
            return;
        }

        const text = documentationProvider.getDocumentationForProperty(value.key.slice(0, -1), value.type);
        if (text) {
            logger.debug(`provideHover for ${value.type || 'unknown'}.${value.key.slice(0, -1)} = ${text}`);

            return new Hover(new MarkdownString(text), value.range);
        }

        return;
    }
}