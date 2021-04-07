import { existsSync, readFileSync } from "fs";
import { Uri, workspace } from "vscode";
import { parse } from "yaml";

type LinkerConfig = {
    builtinTypes?: {
        [key: string]: string[];
    };
    stringTypes?: string[];
    typeLinks?: {
        [key: string]: string[];
    };
};


let config: LinkerConfig;

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
                //
            }

            if ('config' in parsed && parsed.config) {
                config = parsed.config;

                return config;
            }
        }
    }

    return {};
};

// const readLinkerConfig

export const getAdditionalLinks = () => {
    return getLinkerConfig()?.typeLinks ?? {};
};

export const getAdditionalBuiltinTypes = () => {
    return getLinkerConfig()?.builtinTypes ?? {};
};

export const getAdditionalStringTypes = () => {
    return getLinkerConfig()?.stringTypes ?? [];
};
