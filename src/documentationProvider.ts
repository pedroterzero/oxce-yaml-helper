import { workspace } from 'vscode';
import * as docjson from './assets/doc.json';

const doc = docjson as DescriptionMap;

type DescriptionMap = {
    [key: string]: DescriptionEntries
}

type DescriptionEntries = {
    [key: string]: Description
}

type Description = {
    description: string;
    default: string;
}

const map: {[key: string]: {to: string, prefix: boolean}} = {
    ai: {
        to: 'globalVariables',
        prefix: true
    },
    constants: {
        to: 'globalVariables',
        prefix: false
    }
};

export class DocumentationProvider {
    public getDocumentationForProperty(baseProperty: string, baseType: string | undefined): string | undefined {
        const { type, property } = this.getOverride(baseType, baseProperty);

        // find match by type
        if (type && type in doc && property in doc[type]) {
            return this.getMatchText(doc[type][property]);
        }

        // otherwise by unique key
        const match = this.findPossibleDocumentationMatches(property);

        return match;
    }

    private getOverride(baseType: string | undefined, baseProperty: string) {
        let type = baseType;
        let property = baseProperty;
        if (type && type in map) {
            if (map[type].prefix) {
                property = type + '.' + baseProperty;
            }

            type = map[type].to;
        }
        return { type, property };
    }

    private findPossibleDocumentationMatches(property: string): string | undefined {
        let match = '';
        let matches = 0;

        for (const key in doc) {
            for (const propertyKey of Object.keys(doc[key])) {
                if (property === propertyKey) {
                    matches++;
                    match = this.getMatchText(doc[key][property]);
                }
            }
        }

        if (matches !== 1) {
            return;
        }

        return match;
    }

    private getMatchText(description: Description): string {
        let desc = description.description;
        if (workspace.getConfiguration('oxcYamlHelper').get<string>('showDocumentationHover') === 'short') {
            desc = desc.split("\n")[0];
        }

        return desc + "\n\n" + `**Default: ${description.default}**`;
    }
}

export const documentationProvider = new DocumentationProvider();
