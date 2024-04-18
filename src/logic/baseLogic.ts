import { merge } from 'merge-anything';
import { Diagnostic, DiagnosticSeverity, Range, Uri } from 'vscode';
import { LogicDataEntry, Match } from '../rulesetTree';
import { ReferenceFile } from '../workspaceFolderRuleset';
import { WorkspaceFolderRulesetHierarchy } from '../workspaceFolderRulesetHierarchy';
import { FilesWithDiagnostics } from './logicHandler';
import { addRefNodeToPaths } from '../utilities';

export type LogicEntries = { [key: string]: LogicDataEntry[] };
export type LogicCheckMethods = { [key: string]: [(data: any) => void] };

export interface LogicInterface {
    getDiagnosticsPerFile(): FilesWithDiagnostics;
    getFields(): string[];
    getNumericFields(): string[];
    check(data: LogicEntries, file: Uri, diagnostics: Diagnostic[], hierarchy: WorkspaceFolderRulesetHierarchy): void;
    checkRelationLogic(): void;
    storeRelationLogicReference(ref: Match, file: ReferenceFile): void;
}

type EntryValue = {
    [key: string]: number | string;
};

type Entry =
    | number
    | string
    | EntryValue[]
    | {
          [key: string]: Entry;
      };

type EntryData = {
    [key: string]: {
        [key: string]: Entry | (EntryData | undefined);
        refNode?: Entry;
    };
};

export class BaseLogic implements LogicInterface {
    protected fields: LogicCheckMethods = {};
    /**
     * numeric fields makes sure numeric references get picked up by the recursive retriever
     * then also that they get properly handled (not treated as a regular reference)
     */
    protected numericFields: string[] = [];
    protected additionalMetadataFields: string[] = [];
    protected relatedFieldLogicMethods: { [key: string]: (key: string) => void } = {};
    protected diagnostics?: Diagnostic[];
    protected diagnosticsPerFile: { [key: string]: Diagnostic[] } = {};
    protected file?: Uri;
    protected hierarchy?: WorkspaceFolderRulesetHierarchy;

    protected referencesToCheck: { [key: string]: { ref: Match; file: Uri }[] } = {};

    // public constructor () {
    // }

    public getFields(): string[] {
        return Object.keys(this.fields);
    }

    public getNumericFields() {
        return this.numericFields;
    }

    public getAdditionalMetadataFields() {
        return this.additionalMetadataFields;
    }

    public getRelatedLogicFields(): string[] {
        return Object.keys(this.relatedFieldLogicMethods);
    }

    public getDiagnosticsPerFile(): FilesWithDiagnostics {
        return this.diagnosticsPerFile;
    }

    protected generic(_entries: LogicDataEntry[]) {
        //
    }

    protected reset() {
        //
    }

    public check(data: LogicEntries, file: Uri, diagnostics: Diagnostic[], hierarchy: WorkspaceFolderRulesetHierarchy) {
        this.diagnostics = diagnostics;
        this.file = file;
        this.hierarchy = hierarchy;
        const fields = addRefNodeToPaths(this.getFields());
        this.reset();

        for (const key in data) {
            if (fields.includes(key)) {
                if (key in this.fields) {
                    for (let method of this.fields[key]) {
                        method = method.bind(this);
                        method(data[key]);
                    }
                } else {
                    const method = this.generic.bind(this);
                    method(data[key]);
                }
            }
        }
    }

    public checkRelationLogic(): void {
        for (const key in this.relatedFieldLogicMethods) {
            this.relatedFieldLogicMethods[key].bind(this)(key);
        }
    }

    public storeRelationLogicReference(ref: Match, file: ReferenceFile): void {
        if (!(ref.path in this.referencesToCheck)) {
            this.referencesToCheck[ref.path] = [];
        }

        this.referencesToCheck[ref.path].push({
            ref,
            file: file.file,
        });
    }

    protected addDiagnosticForLogicEntry(entry: LogicDataEntry, message: string) {
        if (!entry.rangePosition) {
            throw new Error('rangePosition missing');
        }
        if (!this.diagnostics) {
            throw new Error('diagnostics missing');
        }

        const range = new Range(...entry.rangePosition[0], ...entry.rangePosition[1]);

        this.diagnostics.push(new Diagnostic(range, message, DiagnosticSeverity.Warning));
    }

    protected addDiagnosticForReference(
        ref: { ref: Match; file: Uri },
        message: string,
        severity: DiagnosticSeverity = DiagnosticSeverity.Warning,
    ) {
        if (!ref.ref.rangePosition) {
            throw new Error('rangePosition missing');
        }
        if (!this.diagnostics) {
            throw new Error('diagnostics missing');
        }

        const range = new Range(...ref.ref.rangePosition[0], ...ref.ref.rangePosition[1]);

        if (!(ref.file.path in this.diagnosticsPerFile)) {
            this.diagnosticsPerFile[ref.file.path] = [];
        }

        this.diagnosticsPerFile[ref.file.path].push(new Diagnostic(range, message, severity));
    }

    protected getFieldData<T extends string | number>(
        entries: LogicDataEntry[],
        path: string,
    ): { [key: string]: T } | undefined {
        const ret: { [key: string]: T } = {};
        const nameKey = path.split('.')[0];

        for (const entry of entries) {
            if (entry.path === path) {
                if (entry.names && ['string', 'number'].includes(typeof entry.names[nameKey])) {
                    ret[entry.names[nameKey]] = entry.data as unknown as T;
                }
            }
        }

        return Object.keys(ret).length > 0 ? ret : undefined;
    }

    protected collectGenericData(
        entries: LogicDataEntry[],
        fields: string[],
        data: EntryData,
        mergeDuplicates = false,
    ) {
        for (const field of addRefNodeToPaths(fields)) {
            const fieldData = this.getFieldData(entries, field);
            if (fieldData) {
                const subFieldName = field.split('.').slice(1).join('.');

                for (const key in fieldData) {
                    if (!(key in data)) {
                        data[key] = {};
                    }

                    if (subFieldName.split('.')[0] === 'refNode') {
                        const subFieldName = field.split('.').slice(2).join('.');
                        if (!(subFieldName in data[key])) {
                            data[key][subFieldName] = fieldData[key];
                        }
                    } else if (mergeDuplicates && subFieldName in data[key]) {
                        // if data already exists, merge it (exact same rule in multiple files, for example)
                        this.mergeDuplicates(data, key, subFieldName, fieldData);
                    } else {
                        data[key][subFieldName] = fieldData[key];
                    }
                }
            }
        }
    }

    private mergeDuplicates(
        data: EntryData,
        key: string,
        subFieldName: string,
        fieldData: { [key: string]: string | number },
    ) {
        let merged;

        if (Array.isArray(data[key][subFieldName]) && Array.isArray(fieldData[key])) {
            let small = data[key][subFieldName] as any;
            let large = fieldData[key] as any;
            if (small.length > large.length) {
                const tmp = large;
                large = small;
                small = tmp;
            }

            for (const index in small) {
                large[index] = merge(large[index], small[index]);
            }

            merged = large;
        } else {
            merged = merge(data[key][subFieldName] as any, fieldData[key] as any);
        }
        data[key][subFieldName] = merged;
    }

    protected getNameFromMetadata(ref: Match, type: string) {
        const names = ref.metadata?._names as { [key: string]: string };
        if (names && type in names) {
            return names[type];
        }

        return;
    }
}
