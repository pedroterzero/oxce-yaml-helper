import { DefinitionProvider, TextDocument, Position, Definition, ProviderResult, workspace, WorkspaceFolder } from "vscode";
import { KeyDetector } from "./keyDetector";
import { rulesetParser } from "./rulesetParser";

export class RulesetDefinitionProvider implements DefinitionProvider {

    provideDefinition(document: TextDocument, position: Position): ProviderResult<Definition> {
        let value = KeyDetector.getAbsoluteKeyFromPositionInDocument(position, document);
        if (!value?.key) {
            return;
        }

        let folder = workspace.getWorkspaceFolder(document.uri);
        if (!folder) {
            return;
        }

        // allows looking for refNodes
        if (value.key.indexOf('*') === 0) {
            return rulesetParser.findRefNodeInDocument(document.uri, value.key.slice(1));
        }

        return this.getDefinitions(value, folder);
    }

    private getDefinitions(value: { key: string; range: import("vscode").Range; }, folder: WorkspaceFolder) {
        // what kind of rule are we trying to look up?
        const ruleType = rulesetParser.findTypeOfKey(value.key, value.range);

        return rulesetParser.getDefinitionsByName(folder, value.key, ruleType);
    }
}