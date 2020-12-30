import { ExtensionContext, extensions, Uri, workspace } from "vscode";
import { load } from "flat-cache";
import { ParsedRuleset } from "./rulesetResolver";
import { createHash } from "crypto";
import { rulesetResolver } from "./extension";
import { promises as fsp } from 'fs';
// import { mkdir, readFile, stat } from "fs/promises";

// remove in node 14
const {readFile, stat, mkdir} = fsp;

export class RulesetFileCacheManager {
    private CACHE_DIR = 'oxchelper';
    private context?: ExtensionContext;
    private version = extensions.getExtension('pedroterzero.oxc-yaml-helper')?.packageJSON.version;

    public setExtensionContent(context: ExtensionContext): void {
        this.context = context;
        this.init();
    }
    private async init() {
        if (!this.context) {
            return;
        }

        // check if cache dir exists, otherwise create it
        try {
            await stat(this.getCachePath());
        } catch (error) {
            if (error.code === 'NOENT') {
                await mkdir(this.getCachePath(), { recursive: true });
            }
        }
    }

    private getCachePath (): string {
        if (!this.context) {
            throw new Error('No extension context');
        }

        return Uri.joinPath(this.context.globalStorageUri, '/', this.CACHE_DIR).fsPath;
    }

    public async put(file: Uri, data: ParsedRuleset) {
        if (!this.context) {
            return;
        }

        const path = file.fsPath;
        const fileContents = readFile(path);
        const hash = createHash('md5').update(fileContents.toString() + this.version).digest('hex');

        const cache = this.getCache(file);
        cache.setKey('metadata', {hash});
        cache.setKey('data', JSON.parse(JSON.stringify(data)));
        cache.save();
    }

    public remove(file: Uri) {
        this.getCache(file).removeCacheFile();
    }

    private getCache(file: Uri) {
        return load(file.path.replace(/\//g, '_'), this.getCachePath());
    }

    public async retrieve(file: Uri) {
        if (!this.useCache(file)) {
            return;
        }

        const path = file.fsPath;
        const fileContents = await readFile(path);
        const hash = createHash('md5').update(fileContents.toString() + this.version).digest('hex');

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
