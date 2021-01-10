import { Uri } from "vscode";
import { rulesetResolver } from "./extension";
import { WorkspaceFolderRuleset } from "./workspaceFolderRuleset";

export class WorkspaceFolderRulesetHierarchy {
    private definitions: {[key: string]: {[key: string]: true}} = {};

    public constructor(private ruleset: WorkspaceFolderRuleset) {

    }

    public handleDeletes() {
        const hierarchy = rulesetResolver.getRulesetHierarchy();

        const deletes = this.getDeletes(hierarchy);

        for (const idx in this.ruleset.rulesetFiles) {
            const file =  this.ruleset.rulesetFiles[idx];
            if (!file.file.path.startsWith(hierarchy.vanilla.path + '/')) {
                continue;
            }

            // console.log(`definitions before deleting: ${Object.keys(file.definitions).length} (${file.file.path}) (to delete: ${deletes.length})`);

            this.ruleset.rulesetFiles[idx].definitions = file.definitions.filter(def =>
                !deletes.find(del => del.key === def.name && del.path === def.type)
            );

            // console.log(`definitions after deleting: ${Object.keys(file.definitions).length} (${file.file.path})`);
        }
    }

    private getDeletes(hierarchy: { [key: string]: Uri; }) {
        const modFiles =  this.ruleset.referenceFiles.filter(file => file.file.path.startsWith(Uri.joinPath(hierarchy.mod, '/').path));
        const parsed: {path: string, key: string}[] = [];
        for (const file of modFiles) {
            const refs = file.references.filter(ref => ref.path.match(/^[a-zA-Z]+\.delete$/));

            for (const ref of refs) {
                const section = ref.path.slice(0, ref.path.indexOf('.'));

                if (parsed.find(item => item.path === section && item.key === ref.key)) {
                    // prevent duplicates
                    // console.log(`duplicate ${section} ${ref.key}`);
                    continue;
                }

                parsed.push({
                    path: section,
                    key: ref.key,
                });
            }
        }

        return parsed;
    }
}