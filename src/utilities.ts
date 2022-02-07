import { existsSync, readFileSync } from "fs";
import { env, Uri, window, workspace } from "vscode";
import { parse } from "yaml";

type LinkerConfig = {
    builtinTypes?: {
        [key: string]: string[];
    };
    vetoTypes?: string[];
    globalVariables?: string[];
    ignoreTypes?: string[];
    stringTypes?: string[];
    ignoreStringTypes?: string[];
    typeLinks?: {
        [key: string]: string[];
    };
    keyReferenceTypes?: string[];
    definitionNameKeys?: {[key: string]: string[]};
};

let config: LinkerConfig;
let errorShown = false;

const getLinkerConfig = () => {
    if (config) {
        return config;
    }

    if (workspace?.workspaceFolders) {
        const path = Uri.joinPath(workspace.workspaceFolders[0].uri, 'linker.yml');
        if (existsSync(path.fsPath)) {
            const configFile = readFileSync(path.fsPath);

            let parsed;
            try {
                parsed = parse(configFile.toString());
            } catch (error) {
                console.error('error parsing linker.yml, ignoring it'/*, error*/);
                if (!errorShown) {
                    window.showErrorMessage('Error: could not parse linker.yml, syntax error?', {
                       modal: true
                    }, 'Show documentation').then(result => {
                        if (result === 'Show documentation') {
                            env.openExternal(Uri.parse('https://github.com/pedroterzero/oxce-yaml-helper/wiki/linker.yml'));
                        }
                    });
                    errorShown = true;
                }
            }

            if (parsed && typeof parsed === 'object' && 'config' in parsed && parsed.config) {
                config = parsed.config;

                return config;
            }
        }
    }

    return {};
};

export const getAdditionalLinks = () => {
    return getLinkerConfig()?.typeLinks ?? {};
};

export const getAdditionalBuiltinTypes = () => {
    return getLinkerConfig()?.builtinTypes ?? {};
};

export const getAdditionalStringTypes = () => {
    return getLinkerConfig()?.stringTypes ?? [];
};

export const getAdditionalIgnoreStringTypes = () => {
    return getLinkerConfig()?.ignoreStringTypes ?? [];
};

export const getAdditionalIgnoreTypes = () => {
    return getLinkerConfig()?.ignoreTypes ?? [];
};

export const getAdditionalKeyReferenceTypes = () => {
    return (getLinkerConfig()?.keyReferenceTypes ?? []).reduce((a, v) => ({ ...a, [v]: {}}), {});
};

export const getAdditionalVetoTypes = () => {
    return getLinkerConfig()?.vetoTypes ?? [];
};

export const getAdditionalTypePropertyHints = () => {
    return getLinkerConfig()?.definitionNameKeys ?? {};
};

export const getAdditionalGlobalVariablePaths = () => {
    return getLinkerConfig()?.globalVariables ?? [];
};
