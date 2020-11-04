import { TextDocument, workspace, Location, Range, Uri } from "vscode";
import { logger } from "./logger";
import { rulesetParser } from "./rulesetParser";

export class RulesetRefnodeFinder {
    public async findRefNodeInDocument(file: Uri, key: string): Promise<Location | undefined> {
        logger.debug('Looking for refNode ', key, 'in ', file.path);

        return workspace.openTextDocument(file.path).then((document: TextDocument) => {
            const range = this.findRefNodeRangeInYAML(document.getText(), key);
            if (!range) {
                return;
            }

            return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
        });
    }

    public findRefNodeRangeInYAML(yaml: string, key: string): number[] {
        const doc = rulesetParser.parseDocument(yaml);
        const node = doc.anchors.getNode(key);

        if (node) {
            return node.range as number[];
        }

        return [0, 0];
    }
}

export const rulesetRefnodeFinder = new RulesetRefnodeFinder();
