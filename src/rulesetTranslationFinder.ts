import { JsonObject } from './rulesetParser';
import { Translation } from './rulesetTree';

type ExtraStrings = {
    type: string;
    strings: Record<string, string>;
};

export class RulesetTranslationFinder {
    public findAllVariablesInYamlDocument(doc: any): Translation[] {
        if (!('extraStrings' in doc) || typeof doc.extraStrings !== 'object') {
            return [];
        }

        const translations: Translation[] = [];

        const entries = doc.extraStrings as Array<JsonObject>;
        for (const entry of entries) {
            const extraStrings = this.extractExtraStringsRule(entry);

            if (extraStrings) {
                for (const key in extraStrings.strings) {
                    translations.push({
                        language: extraStrings.type,
                        key: key,
                        value: extraStrings.strings[key] as string,
                    });
                }
            }
        }

        return translations;
    }

    public findAllTranslationsInTranslationFile(doc: any, currentLocale: string): Translation[] {
        const translations: Translation[] = [];

        for (const locale in doc) {
            if (locale !== currentLocale) {
                continue;
            }

            const entries = doc[locale] as { [key: string]: string };
            for (const key in entries) {
                translations.push({
                    language: locale,
                    key: key,
                    value: entries[key],
                });
            }
        }

        return translations;
    }

    private extractExtraStringsRule(entry: any): ExtraStrings | undefined {
        if (!('type' in entry) || !('strings' in entry)) {
            return;
        }

        if (typeof entry.type !== 'string' || entry.type.trim().length === 0) {
            return;
        }

        if (typeof entry.strings !== 'object') {
            return;
        }

        return {
            type: entry.type,
            strings: entry.strings as Record<string, string>,
        };
    }
}

export const rulesetTranslationFinder = new RulesetTranslationFinder();
