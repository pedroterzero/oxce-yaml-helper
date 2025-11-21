import { ExtensionContext, extensions, Uri, workspace } from 'vscode';
import { create } from 'flat-cache';
import { ParsedRuleset } from './rulesetResolver';
import { createHash } from 'crypto';
import { rulesetResolver } from './extension';
import { mkdir, readFile, stat } from 'fs/promises';

export class RulesetFileCacheManager {
    private CACHE_DIR = 'oxchelper';
    private context?: ExtensionContext;
    // private version = extensions.getExtension('pedroterzero.oxc-yaml-helper')?.packageJSON.version;

    public setExtensionContent(context: ExtensionContext): void {
        this.context = context;
        this.init();
    }

    private get version() {
        return extensions.getExtension('pedroterzero.oxc-yaml-helper')?.packageJSON.version;
    }

    private async init() {
        console.log(`version: ${extensions.getExtension('pedroterzero.oxc-yaml-helper')?.packageJSON.version}`);

        if (!this.context) {
            return;
        }

        // check if cache dir exists, otherwise create it
        console.debug(`Checking if cache dir exists: ${this.getCachePath()}`);
        try {
            await stat(this.getCachePath());
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                await mkdir(this.getCachePath(), { recursive: true });
            } else {
                throw error;
            }
        }
    }

    private getCachePath(): string {
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
        const fileContents = await readFile(path);
        const hash = createHash('md5')
            .update(fileContents.toString() + this.version)
            .digest('hex');

        const cache = this.getCache(file);
        cache.setKey('metadata', { hash });
        cache.setKey('data', JSON.parse(JSON.stringify(data)));
        cache.save();
    }

    public remove(file: Uri) {
        this.getCache(file).removeCacheFile();
    }

    private getCache(file: Uri) {
        const cacheId = file.path.replace(/[/:]/g, '_');
        // console.log(`getting cache object for ${file.path}, cacheId: ${cacheId}`);
        return create({
            cacheId,
            cacheDir: this.getCachePath(),
        });
    }

    public async retrieve(file: Uri) {
        if (!this.useCache(file)) {
            return;
        }

        const path = file.fsPath;
        const fileContents = await readFile(path);
        const hash = createHash('md5')
            .update(fileContents.toString() + this.version)
            .digest('hex');

        const cache = this.getCache(file);
        const result = cache.all();

        if (result && result.metadata?.hash === hash) {
            const parsed = result.data;

            const ret: ParsedRuleset = {
                translations: 'translations' in parsed ? parsed.translations : [],
            };
            ['definitions', 'references', 'variables', 'logicData'].forEach((key) => {
                const mykey = key as keyof ParsedRuleset;
                if (mykey in parsed) {
                    ret[mykey] = parsed[key];
                }
            });

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
