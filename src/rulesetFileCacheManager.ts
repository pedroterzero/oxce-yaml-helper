import { ExtensionContext, Uri, workspace } from "vscode";
import * as md5File from "md5-file";
import { existsSync, mkdirSync } from "fs";
import { get, put, rm } from "cacache";
import { ParsedRuleset } from "./rulesetResolver";

export class RulesetFileCacheManager {
    private CACHE_DIR = 'oxchelper';
    private context?: ExtensionContext;

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
        const hash = md5File.sync(path);
        put(this.getCachePath(), path, JSON.stringify(data), {metadata: {hash}});
    }

    public async retrieve(file: Uri) {
        const path = file.fsPath;

        // have to do this, otherwise the problems won't show
        await workspace.openTextDocument(path);
        const info = await get.info(this.getCachePath(), path);
        const hash = md5File.sync(path);

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
