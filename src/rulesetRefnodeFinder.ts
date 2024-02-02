import { workspace, Location, Range, Uri } from "vscode";
import { logger } from "./logger";
import { rulesetParser } from "./rulesetParser";

export class RulesetRefnodeFinder {
    public findRefNodeInDocument(file: Uri, key: string): Location | undefined {
        logger.debug(`Looking for refNode ${key} in ${file.path}`);

        const document = workspace.textDocuments.find(doc => doc.uri.path === file.path);
        if (!document) {
            throw new Error(`${file.path} not open, but it must be because we're looking for a refNode`);
        }

        let range = this.findRefNodeRangeInYAML(document.getText(), key);
        if (!range) {
            return;
        }

        range = rulesetParser.fixRangesForWindowsLineEndingsIfNeeded(document, [range[0], range[1]]);

        return new Location(file, new Range(document.positionAt(range[0]), document.positionAt(range[1])));
    }

    public findRefNodeRangeInYAML(yaml: string, key: string): number[] {
        const doc = rulesetParser.parseDocument(yaml).parsed;
        // const node = doc.anchors.getNode(key);

        if (key) {
            console.log(key, doc);
        }
        // if (node) {
        //     return node.range as number[];
        // }

        return [0, 0];
    }
}

export const rulesetRefnodeFinder = new RulesetRefnodeFinder();
