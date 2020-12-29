import { Uri } from "vscode";
import { rulesetResolver } from "./extension";
import { WorkspaceFolderRuleset } from "./workspaceFolderRuleset";

export class WorkspaceFolderRulesetHierarchy {
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

            // console.log(`definitions before deleting: ${Object.keys(file.definitions).length} (${file.file.path})`);

            for (const del of deletes) {
                for (const defIndex in file.definitions) {
                    const def = file.definitions[defIndex];
                    if (del.key === def.name && del.path === def.type) {
                        delete file.definitions[defIndex];
                    }
                }
            }

            this.ruleset.rulesetFiles[idx].definitions = Object.values(file.definitions);
            // console.log(`definitions after deleting: ${Object.keys(file.definitions).length} (${file.file.path})`);
        }
    }

    private getDeletes(hierarchy: { [key: string]: Uri; }) {
        const modFiles =  this.ruleset.referenceFiles.filter(file => file.file.path.startsWith(Uri.joinPath(hierarchy.mod, '/').path));
        const parsed = [];
        for (const file of modFiles) {
            const refs = file.references.filter(ref => ref.path.match(/^[a-zA-Z]+\.delete$/));

            for (const ref of refs) {
                const section = ref.path.slice(0, ref.path.indexOf('.'));

                parsed.push({
                    path: section,
                    key: ref.key,
                });
            }
        }

        return parsed;
    }
}