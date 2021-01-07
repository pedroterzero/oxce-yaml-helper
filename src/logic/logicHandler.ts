import { Diagnostic, Uri } from "vscode";
import { LogicDataEntry, Match } from "../rulesetTree";
import { ReferenceFile } from "../workspaceFolderRuleset";
import { mergeAndConcat } from "merge-anything";
import { LogicInterface } from "./baseLogic";
import { MapScriptsLogic } from "./mapScriptsLogic";
import { RegionsLogic } from "./regionsLogic";
import { CraftWeaponsLogic } from "./craftWeaponsLogic";
import { UfopaediaLogic } from "./ufopaediaLogic";
import { ItemsLogic } from "./itemsLogic";
import { SoldierTransformationLogic } from "./soldierTransformationLogic";
import { AlienDeploymentsLogic } from "./alienDeploymentsLogic";
import { ManufactureShortcutLogic } from "./manufactureShortcutLogic";
import { AlienMissionsLogic } from "./alienMissionsLogic";
import { WorkspaceFolderRulesetHierarchy } from "../workspaceFolderRulesetHierarchy";

const handlers = [
    AlienDeploymentsLogic,
    AlienMissionsLogic,
    CraftWeaponsLogic,
    ItemsLogic,
    ManufactureShortcutLogic,
    MapScriptsLogic,
    RegionsLogic,
    SoldierTransformationLogic,
    UfopaediaLogic
];

export type FilesWithDiagnostics = {[key: string]: Diagnostic[]};

export class LogicHandler {
    private instances: {[key: string]: LogicInterface} = {};
    private relatedLogicFields: {[key: string]: LogicInterface} = {};

    public constructor () {
        // this.instances = {};
        for (const handler of handlers) {
            const handlerObject = new handler();
            this.instances[handler.toString()] = handlerObject;

            for (const field of handlerObject.getRelatedLogicFields()) {
                this.relatedLogicFields[field] = handlerObject;
            }
        }
    }

    public check(file: Uri, diagnostics: Diagnostic[], data: { [key: string]: LogicDataEntry[]; }, hierarchy: WorkspaceFolderRulesetHierarchy) {
        for (const handler of Object.values(this.instances)) {
            // this.instances[handler.toString()] = new handler();
            handler.check(data, file, diagnostics, hierarchy);
        }
    }

    public checkRelationLogic(): FilesWithDiagnostics {
        let diagnostics = {};

        for (const handler of Object.values(this.instances)) {
            handler.checkRelationLogic();
            diagnostics = mergeAndConcat(diagnostics, handler.getDiagnosticsPerFile());
        }

        return diagnostics;
    }

    public getRelatedLogicFields() {
        return Object.keys(this.relatedLogicFields);
    }

    public isRelatedLogicField(path: string) {
        return path in this.relatedLogicFields;
    }

    public storeRelationLogicReference(ref: Match, file: ReferenceFile) {
        if (!(ref.path in this.relatedLogicFields)) {
            return;
        }

        this.relatedLogicFields[ref.path].storeRelationLogicReference(ref, file);
        // for (const handler of Object.values(this.instances)) {
            // this.instances[handler.toString()] = new handler();
            // handler.check(data, file, diagnostics);
        // }
    }

    public getPaths(): string[] {
        let paths: string[] = [];
        for (const handler of handlers) {
            const handlerObject = new handler();
            paths = paths.concat(handlerObject.getFields());
        }

        return paths;
    }

    public getNumericFields(): string[] {
        const fields: {[key: string]: boolean} = {};
        for (const handler of handlers) {
            const handlerObject = new handler();
            for (const field of handlerObject.getNumericFields()) {
                fields[field] = true;
            }
        }

        return Object.keys(fields).sort();
    }

}

// export const logicHandler = new LogicHandler();
