import { Hover, HoverProvider, MarkdownString, Position, TextDocument } from 'vscode';
import { rulesetResolver } from './extension';
import { KeyDetector } from './keyDetector';
import { logger } from './logger';

export class RulesetHoverProvider implements HoverProvider {

    public provideHover(document: TextDocument, position: Position): Hover | undefined {
        const value = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document);
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
}