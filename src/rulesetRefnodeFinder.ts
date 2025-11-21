import { workspace, Location, Range, Uri } from 'vscode';
import { logger } from './logger';
import { rulesetParser } from './rulesetParser';
import { Node, Pair, YAMLMap, YAMLSeq } from 'yaml2';

export class RulesetRefnodeFinder {
    public findRefNodeInDocument(file: Uri, key: string): Location | undefined {
        logger.debug(`Looking for refNode ${key} in ${file.path}`);

        const document = workspace.textDocuments.find((doc) => doc.uri.path === file.path);
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

    public findRefNodeRangeInYAML(yaml: string, aliasKey: string): number[] {
        const document = rulesetParser.parseDocument(yaml).regular;

        // Function to recursively search for an anchor
        const findAnchor = (node: Node): Node | undefined => {
            if (node && node.anchor === aliasKey) {
                return node; // Node with the matching anchor
            }

            if (node instanceof YAMLSeq || node instanceof YAMLMap) {
                for (const item of node.items) {
                    const valueNode = item instanceof Pair ? item.value : item;
                    const found = findAnchor(valueNode);
                    if (found) {
                        return found;
                    }
                }
            }
            return undefined;
        };

        if (document.contents) {
            const anchorNode = findAnchor(document.contents);

            if (anchorNode && anchorNode.range) {
                return [anchorNode.range[0], anchorNode.range[1]];
            }
        }

        return [0, 0];
    }
}

export const rulesetRefnodeFinder = new RulesetRefnodeFinder();
