import { ExtensionContext, extensions, Uri, workspace } from "vscode";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { get, put, rm } from "cacache";
import { ParsedRuleset } from "./rulesetResolver";
import { createHash } from "crypto";

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

    public cache(file: Uri, data: ParsedRuleset) {
        if (!this.context) {
            return;
        }

        const path = file.fsPath;
        const hash = createHash('md5').update(readFileSync(path).toString() + this.version).digest('hex');
        put(this.getCachePath(), path, JSON.stringify(data), {metadata: {hash}});
    }

    public async retrieve(file: Uri) {
        if (workspace.getConfiguration('oxcYamlHelper').get<boolean>('disableCache')) {
            return;
        }

        const path = file.fsPath;
        const info = await get.info(this.getCachePath(), path);
        const hash = createHash('md5').update(readFileSync(path).toString() + this.version).digest('hex');

        if (info && info.metadata.hash === hash) {
            const cache = await get(this.getCachePath(), path);
            const parsed = JSON.parse(cache.data.toString());

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
        } else if (info && info.metadata.hash !== hash) {
            rm(this.getCachePath(), path);
        }

        return;
    }
}

export const rulesetFileCacheManager = new RulesetFileCacheManager();
