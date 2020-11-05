import { rulesetResolver } from "./extension";

class RulesetDefinitionKeeper {
    public init () {
        this.addOnLoadEvent();
    }

    private addOnLoadEvent() {
        rulesetResolver.onDidLoad(this.onRulesetsLoaded);
    }

    onRulesetsLoaded() {
        // const files = this.getOrCreateWorkspaceFolderRuleset(workspaceFolder)?.getRuleFiles(key, ruleType);
        // return files;

        console.log('hi! lets go');
    }
}

export const rulesetDefinitionKeeper = new RulesetDefinitionKeeper();
