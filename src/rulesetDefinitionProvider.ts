import { DefinitionProvider, TextDocument, Position, Definition, ProviderResult, workspace, Uri, WorkspaceFolder } from "vscode";
import { logger } from "./logger";
import { KeyDetector } from "./keyDetector";
import { rulesetTree } from "./rulesetTree";
import { rulesetParser } from "./rulesetParser";
import { RulesetPart } from "./workspaceFolderRuleset";

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

        // get the rulesets that have the key
        const ruleFiles = rulesetTree.getRuleFiles(value.key, folder, ruleType);
        logger.debug('Found ', ruleFiles?.length, ' matches for ', value.key);

        return rulesetParser.findKeyValueLocationInDocuments(this.getRulesetUris(ruleFiles), value.key);
    }

    private getRulesetUris(ruleFiles: RulesetPart[] | undefined) {
        const files: Uri[] = [];

        ruleFiles?.forEach(ruleFile => {
            logger.debug('Rule file:', ruleFile);
            if (!ruleFile?.file) {
                throw new Error('could not load ' + ruleFile);
            }

            files.push(ruleFile.file);
        });

        return files;
    }
}