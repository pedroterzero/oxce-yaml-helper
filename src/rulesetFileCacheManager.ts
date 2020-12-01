import { ExtensionContext, extensions, Uri, workspace } from "vscode";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { load } from "flat-cache";
import { ParsedRuleset } from "./rulesetResolver";
import { createHash } from "crypto";
import { rulesetResolver } from "./extension";

export class RulesetFileCacheManager {
    private CACHE_DIR = 'oxchelper';
    private context?: ExtensionContext;
    private version = extensions.getExtension('pedroterzero.oxc-yaml-helper')?.packageJSON.version;

    public setExtensionContent(context: ExtensionContext): void {
        this.context = context;
        this.init();
    }
    private init() {
        if (!this.context) {
            return;
        }

        if (!existsSync(this.getCachePath())) {
            mkdirSync(this.getCachePath(), { recursive: true });
        }
    }

    private getCachePath (): string {
        if (!this.context) {
            throw new Error('No extension context');
        }

        return Uri.joinPath(this.context.globalStorageUri, '/', this.CACHE_DIR).fsPath;
    }

    public put(file: Uri, data: ParsedRuleset) {
        if (!this.context) {
            return;
        }

        const path = file.fsPath;
        const hash = createHash('md5').update(readFileSync(path).toString() + this.version).digest('hex');

        const cache = this.getCache(file);
        cache.setKey('metadata', {hash});
        cache.setKey('data', JSON.parse(JSON.stringify(data)));
        cache.save();
    }

    private getCache(file: Uri) {
        return load(file.path.replace(/\//g, '_'), this.getCachePath());
    }

    public async retrieve(file: Uri) {
        if (!this.useCache(file)) {
            return;
        }

        const path = file.fsPath;
        const hash = createHash('md5').update(readFileSync(path).toString() + this.version).digest('hex');

        const cache = this.getCache(file);
        const result = cache.all();

        if (result && result.metadata?.hash === hash) {
            const parsed = result.data;

            const ret: ParsedRuleset = {
                translations: 'translations' in parsed ? parsed.translations : [],
            };
            if ('definitions' in parsed) {
                ret.definitions = parsed.definitions;
            }
            if ('references' in parsed) {
                ret.references = parsed.references;
            }
            if ('variables' in parsed) {
                ret.variables = parsed.variables;
            }

            return ret;
        } else if (result && result.metadata?.hash !== hash) {
            cache.removeCacheFile();
        }

        return;
    }

    private useCache(file: Uri): boolean {
        const cacheStrategy = workspace.getConfiguration('oxcYamlHelper').get<string>('cacheStrategy');
        if (!cacheStrategy) {
            return true;
        }

        if (cacheStrategy === 'nothing') {
            return false;
        }

        const cacheAssets = ['all', 'only cache languages, assets', 'only cache assets'].includes(cacheStrategy);
        const cacheLanguages = ['all', 'only cache languages', 'only cache languages, assets'].includes(cacheStrategy);

        const isAssetFile = file.path.startsWith(rulesetResolver.getRulesetHierarchy().vanilla.path + '/');
        const isLanguageFile = file.path.match(/\/Language\/[^/]+\.yml$/i);

        if (!cacheAssets && isAssetFile) {
            return false;
        } else if (!cacheLanguages && isLanguageFile) {
            return false;
        } else if (!isAssetFile && !isLanguageFile && cacheStrategy !== 'all') {
            return false;
        }

        return true;
    }
}

export const rulesetFileCacheManager = new RulesetFileCacheManager();
