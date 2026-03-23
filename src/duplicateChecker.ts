import { Diagnostic, DiagnosticRelatedInformation, DiagnosticSeverity, Location, Range, Uri, workspace } from 'vscode';
import { DefinitionLookup } from './rulesetTree';
import { TypeLookup } from './workspaceFolderRuleset';
import { rulesetResolver } from './extension';
import { logger } from './logger';
import { typeHintMessages } from './definitions/typeHintMessages';
import { pathStartsWith } from './utilities';
import { ReferenceFile } from './workspaceFolderRuleset';

type Duplicates = {
    [key: string]: DefinitionLookup[];
};

type DuplicateMatches = {
    key: string;
    definition: DefinitionLookup;
    duplicates: DefinitionLookup[];
};

export class DuplicateChecker {
    private duplicatesPerFile: { [key: string]: DuplicateMatches[] } = {};

    private ignoreDefinitionRegexes: RegExp[] = [
        /^extraSprites\.files\.\d+$/,
        /^extended\.tags\.([a-zA-Z]+)$/,
        /^terrains\.mapBlocks\[\]$/,
    ];

    private ignoreTypeValues: { [key: string]: string[] } = {
        extraSprites: [
            'BASEBITS.PCK',
            'BIGOBS.PCK',
            'FLOOROB.PCK',
            'HANDOB.PCK',
            'INTICON.PCK',
            'Projectiles',
            'SMOKE.PCK',
        ],
        extraSounds: ['BATTLE.CAT'],
    };

    public checkDefinitions(lookup: TypeLookup) {
        this.duplicatesPerFile = {};

        if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('findDuplicateDefinitions')) {
            return;
        }

        logger.debug(`Existing lookups: ${Object.keys(lookup).length}`);

        const dupes = this.getDuplicatesByKeyAndType(lookup);
        logger.debug(`Number of types that have duplicates: ${Object.keys(dupes).length}`);

        for (const type in dupes) {
            for (const defs of Object.values(dupes[type])) {
                this.groupDuplicatesByFile(defs, type);
            }
        }
    }

    public addDuplicateDefinitions(file: ReferenceFile, diagnostics: Diagnostic[]) {
        if (!(file.file.path in this.duplicatesPerFile)) {
            return;
        }

        const duplicates = this.duplicatesPerFile[file.file.path];
        for (const duplicate of duplicates) {
            const relatedInformation = [];
            for (const dupdef of duplicate.duplicates) {
                relatedInformation.push(
                    new DiagnosticRelatedInformation(
                        new Location(dupdef.file, new Range(...dupdef.rangePosition[0], ...dupdef.rangePosition[1])),
                        'also defined here',
                    ),
                );
            }

            let message = `${duplicate.definition.type} ${duplicate.key} is duplicate (add # ignoreDuplicate after this to ignore this entry)`;

            message = this.checkDuplicateHints(duplicate, message);

            const range = new Range(...duplicate.definition.rangePosition[0], ...duplicate.definition.rangePosition[1]);
            diagnostics.push({
                range,
                message,
                severity: DiagnosticSeverity.Warning,
                relatedInformation,
            });
        }
    }

    private checkDuplicateHints(duplicate: DuplicateMatches, message: string) {
        if (duplicate.definition.type.startsWith('extraSprites.')) {
            if (duplicate.definition.metadata?.spriteSize) {
                message += `\nHint: ${typeHintMessages
                    .extraSpritesMulti(duplicate.definition.metadata.spriteSize as string)
                    .trim()}`;
            }
        }

        return message;
    }

    private groupDuplicatesByFile(defs: DefinitionLookup[], type: string) {
        for (const idx1 in defs) {
            const def = defs[idx1];

            const mydefs = [];
            for (const idx2 in defs) {
                if (idx1 !== idx2) {
                    mydefs.push(defs[idx2]);
                }
            }

            if (!(def.file.path in this.duplicatesPerFile)) {
                this.duplicatesPerFile[def.file.path] = [];
            }

            this.duplicatesPerFile[def.file.path].push({
                key: type,
                definition: def,
                duplicates: mydefs,
            });
        }
    }

    private getDuplicatesByKeyAndType(lookup: TypeLookup) {
        const dupes: { [key: string]: { [key: string]: DefinitionLookup[] } } = {};
        const hierarchy = rulesetResolver.getRulesetHierarchy();

        for (const key in lookup) {
            const duplicates = this.getDuplicateKeys(lookup[key], key, hierarchy);
            if (!duplicates) {
                continue;
            }

            const grouped = this.groupDuplicates(duplicates);
            if (Object.keys(grouped).length) {
                dupes[key] = grouped;
            }
        }

        return dupes;
    }

    private getDuplicateKeys(
        keyDefs: DefinitionLookup[],
        key: string,
        hierarchy: { [key: string]: Uri },
    ): Duplicates | undefined {
        const duplicates: Duplicates = {};

        definitions: for (const def of keyDefs) {
            if (
                def.metadata &&
                '_comment' in def.metadata &&
                (def.metadata._comment as string).includes('ignoreDuplicate')
            ) {
                continue;
            }

            if (def.type in this.ignoreTypeValues && this.ignoreTypeValues[def.type].indexOf(key) !== -1) {
                continue;
            }
            for (const re of this.ignoreDefinitionRegexes) {
                if (re.exec(def.type)) {
                    continue definitions;
                }
            }

            if (!pathStartsWith(def.file, hierarchy.mod)) {
                continue;
            }

            if (!(def.type in duplicates)) {
                duplicates[def.type] = [];
            }

            duplicates[def.type].push(def);
        }

        return duplicates;
    }

    private groupDuplicates(duplicates: Duplicates) {
        const ret: { [key: string]: DefinitionLookup[] } = {};

        for (const type in duplicates) {
            const typeDupes = duplicates[type];
            if (typeDupes.length > 1) {
                ret[type] = typeDupes;
            }
        }

        return ret;
    }
}
