import * as docjson from './assets/doc.json';

const doc = docjson as DescriptionMap;

type DescriptionMap = {
    [key: string]: Description
}

type Description = {
    [key: string]: {description: string, default: string}
}

class DocumentationProvider {
    public getDocumentationForProperty(property: string): string | undefined {
        let matches = 0;
        let match = '';

        // @todo actually look at what kind of property we are looking at
        for (const key in doc) {
            for (const propertyKey of Object.keys(doc[key])) {
                if (property === propertyKey) {
                    matches++;
                    match = doc[key][propertyKey].description;
                }
            }
        }

        if (matches !== 1) {
            return;
        }

        return match;
    }
}

export const documentationProvider = new DocumentationProvider();
