import { Stats } from 'fs';
import { mkdir, readFile, stat, writeFile, unlink } from 'fs/promises';
import { serialize, deserialize } from 'v8';
import { ExtensionContext, extensions, Uri } from 'vscode';
import { cachedConfig } from './cachedConfiguration';
import { ParsedRuleset } from './rulesetResolver';
import { rulesetResolver } from './extension';

const cacheAssetsStrategies = new Set(['all', 'only cache languages, assets', 'only cache assets']);
const cacheLanguagesStrategies = new Set(['all', 'only cache languages', 'only cache languages, assets']);

interface CacheMetadata {
    mtimeMs: number;
    size: number;
    version: string;
}

export class RulesetFileCacheManager {
    private CACHE_DIR = 'oxchelper';
    private context?: ExtensionContext;
    private metadataIndex = new Map<string, CacheMetadata>();
    private cachedVersion: string | undefined;
    private readyPromise?: Promise<void>;
    private metadataWriteQueue = Promise.resolve();

    public async ensureReady(): Promise<void> {
        await this.readyPromise;
    }

    public setExtensionContent(context: ExtensionContext): void {
        this.context = context;
        this.readyPromise = this.init();
    }

    private get version(): string {
        if (!this.cachedVersion) {
            this.cachedVersion =
                extensions.getExtension('pedroterzero.oxc-yaml-helper')?.packageJSON.version ?? '0.0.0';
        }
        return this.cachedVersion!;
    }

    private async init() {
        console.log(`version: ${this.version}`);

        if (!this.context) {
            return;
        }

        const cachePath = this.getCachePath();
        try {
            await stat(cachePath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                await mkdir(cachePath, { recursive: true });
            } else {
                throw error;
            }
        }

        await this.loadMetadataIndex();
    }

    private getCachePath(): string {
        if (!this.context) {
            throw new Error('No extension context');
        }

        return Uri.joinPath(this.context.globalStorageUri, '/', this.CACHE_DIR).fsPath;
    }

    private getMetadataPath(): string {
        return `${this.getCachePath()}/_metadata.json`;
    }

    private getCacheId(file: Uri): string {
        return file.path.replace(/[/:]/g, '_');
    }

    private getDataPath(cacheId: string): string {
        return `${this.getCachePath()}/${cacheId}`;
    }

    private async loadMetadataIndex(): Promise<void> {
        try {
            const data = await readFile(this.getMetadataPath(), 'utf8');
            const parsed: Record<string, CacheMetadata> = JSON.parse(data);
            this.metadataIndex = new Map(Object.entries(parsed));
        } catch {
            // Index doesn't exist or is corrupt — start fresh
            this.metadataIndex = new Map();
        }
    }

    private saveMetadataIndex(): void {
        this.metadataWriteQueue = this.metadataWriteQueue
            .then(() => writeFile(this.getMetadataPath(), JSON.stringify(Object.fromEntries(this.metadataIndex))))
            .catch(() => {});
    }

    public async put(file: Uri, data: ParsedRuleset, fileStat?: Stats) {
        if (!this.context) {
            return;
        }

        if (!fileStat) {
            fileStat = await stat(file.fsPath);
        }
        const cacheId = this.getCacheId(file);

        await writeFile(this.getDataPath(cacheId), serialize(data));

        this.metadataIndex.set(cacheId, {
            mtimeMs: fileStat.mtimeMs,
            size: fileStat.size,
            version: this.version,
        });

        this.saveMetadataIndex();
    }

    public remove(file: Uri) {
        const cacheId = this.getCacheId(file);
        this.metadataIndex.delete(cacheId);
        unlink(this.getDataPath(cacheId)).catch(() => {});
        this.saveMetadataIndex();
    }

    public async retrieve(file: Uri, fileStat?: Stats) {
        await this.readyPromise;

        if (!this.useCache(file)) {
            return;
        }

        const cacheId = this.getCacheId(file);
        const meta = this.metadataIndex.get(cacheId);
        if (!meta || meta.version !== this.version) {
            return;
        }

        if (!fileStat) {
            fileStat = await stat(file.fsPath);
        }

        if (meta.mtimeMs !== fileStat.mtimeMs || meta.size !== fileStat.size) {
            this.metadataIndex.delete(cacheId);
            return;
        }

        // Metadata matches — read data file (async, not blocking event loop)
        try {
            const buf = await readFile(this.getDataPath(cacheId));
            return deserialize(buf) as ParsedRuleset;
        } catch {
            // Data file missing or corrupt (includes old JSON format after upgrade)
            this.metadataIndex.delete(cacheId);
            return;
        }
    }

    private useCache(file: Uri): boolean {
        const cacheStrategy = cachedConfig.cacheStrategy;
        if (!cacheStrategy) {
            return true;
        }

        if (cacheStrategy === 'nothing') {
            return false;
        }

        const cacheAssets = cacheAssetsStrategies.has(cacheStrategy);
        const cacheLanguages = cacheLanguagesStrategies.has(cacheStrategy);

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
