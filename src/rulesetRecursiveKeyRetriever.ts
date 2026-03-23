import { perfTimer } from './performanceTimer';
import { MetadataExtractor } from './metadataExtractor';
import { YamlTraverser, NodeInfo } from './yamlTraverser';
import { YAMLDocument } from './rulesetParser';
import { LogicDataEntry, Match, RuleType } from './rulesetTree';

export class RulesetRecursiveKeyRetriever {
    private traverser: YamlTraverser;

    constructor() {
        this.traverser = new YamlTraverser(new MetadataExtractor());
    }

    public getKeyInformationFromYAML(doc: YAMLDocument, key: string, range: number[]): RuleType | undefined {
        const [references] = this.findAllReferencesInYamlDocument(doc, true);

        for (const ref of references) {
            if ((ref.key === key || ref.key.toString() === key) && this.checkForRangeMatch(range, ref.range)) {
                const ruleMatch: RuleType = {
                    type: ref.path.split('.').slice(0, -1).join('.'),
                    key: ref.path.split('.').slice(-1).join('.'),
                };

                if (ref.metadata) {
                    ruleMatch.metadata = ref.metadata;
                }

                return ruleMatch;
            }
        }

        return;
    }

    public findAllReferencesInYamlDocument(doc: YAMLDocument, lookupAll = false): [Match[], LogicDataEntry[]] {
        perfTimer.start('retriever.findAllReferences');
        const ret = this.findKeyInformationInYamlDocument(doc, lookupAll);
        perfTimer.stop('retriever.findAllReferences');
        return ret;
    }

    private findKeyInformationInYamlDocument(
        yamlDocument: YAMLDocument,
        lookupAll: boolean,
    ): [Match[], LogicDataEntry[]] {
        const [nodes, logicData] = this.traverser.traverseNode(yamlDocument.contents!, lookupAll);

        const matches: Match[] = nodes.map((node: NodeInfo) => {
            const match: Match = {
                key: node.value,
                path: node.path,
                range: node.range,
                ...(node.metadata ? { metadata: node.metadata } : {}),
            };

            return match;
        });

        return [matches, logicData];
    }

    private checkForRangeMatch(range1: number[], range2: number[]): boolean {
        return range1[0] === range2[0] && range1[1] === range2[1];
    }
}

export const rulesetRecursiveKeyRetriever = new RulesetRecursiveKeyRetriever();

