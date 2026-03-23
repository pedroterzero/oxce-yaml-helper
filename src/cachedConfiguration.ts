import { workspace } from 'vscode';

class CachedConfiguration {
    private _config = workspace.getConfiguration('oxcYamlHelper');

    constructor() {
        workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('oxcYamlHelper')) {
                this._config = workspace.getConfiguration('oxcYamlHelper');
            }
        });
    }

    get findMissingTranslations(): boolean {
        return this._config.get<boolean>('findMissingTranslations') ?? false;
    }

    get findDuplicateDefinitions(): boolean {
        return this._config.get<boolean>('findDuplicateDefinitions') ?? false;
    }

    get cacheStrategy(): string | undefined {
        return this._config.get<string>('cacheStrategy');
    }

    get validateCategories(): string {
        return this._config.get<string>('validateCategories') ?? 'no';
    }

    get translationLocale(): string {
        return this._config.get<string>('translationLocale') ?? 'en-US';
    }
}

export const cachedConfig = new CachedConfiguration();
