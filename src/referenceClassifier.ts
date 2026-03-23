import { workspace } from 'vscode';
import { Match } from './rulesetTree';
import { builtinResourceIds, builtinTypes } from './definitions/builtinTypes';
import { ignoreTypes } from './definitions/ignoreTypes';
import { ignoreStringTypes, stringTypes } from './definitions/stringTypes';
import { typedProperties } from './typedProperties';
import { perfTimer } from './performanceTimer';

export class ReferenceClassifier {
    private builtinTypeRegexes: { regex: RegExp; values: string[] }[] = [];
    private stringTypeRegexes: RegExp[] = [];
    private ignoreTypesRegexes: RegExp[] = [];

    public constructor() {
        this.loadRegexes();
    }

    /**
     * Returns true if the reference should be checked (i.e. is NOT a known skip case).
     */
    public typeExists(ref: Match): boolean {
        perfTimer.start('checker.typeExists');
        if (ref.path.match(/^[a-z]+\.delete$/i)) {
            perfTimer.stop('checker.typeExists');
            return false;
        }
        if (ref.path.startsWith('extraStrings.') || ref.path.startsWith('extended.scripts.')) {
            perfTimer.stop('checker.typeExists');
            return false;
        }
        if (this.checkForIgnoredType(ref.path)) {
            perfTimer.stop('checker.typeExists');
            return false;
        }
        if (
            !workspace.getConfiguration('oxcYamlHelper').get<boolean>('findMissingTranslations') &&
            this.isExtraStringType(ref.path)
        ) {
            perfTimer.stop('checker.typeExists');
            return false;
        }
        if (ref.path in builtinTypes && builtinTypes[ref.path].indexOf(ref.key) !== -1) {
            perfTimer.stop('checker.typeExists');
            return false;
        } else if (this.matchesBuiltinTypeRegex(ref.path, ref.key)) {
            perfTimer.stop('checker.typeExists');
            return false;
        }

        if (ref.path in builtinResourceIds) {
            const [min, max] = builtinResourceIds[ref.path];
            if (parseInt(ref.key) >= min && parseInt(ref.key) <= max) {
                perfTimer.stop('checker.typeExists');
                return false;
            }
        }

        perfTimer.stop('checker.typeExists');
        return true;
    }

    public isExtraStringType(path: string): boolean {
        if (stringTypes.includes(path)) {
            return true;
        }

        for (const regex of this.stringTypeRegexes) {
            if (regex.exec(path)) {
                return true;
            }
        }

        return false;
    }

    public isCheckableTranslatableString(ref: Match): boolean {
        if (!workspace.getConfiguration('oxcYamlHelper').get<boolean>('findMissingTranslations')) {
            return false;
        }

        if (this.isExtraStringType(ref.path)) {
            return true;
        }
        if (
            typedProperties.isDefinitionPropertyForPath(
                ref.path.split('.').slice(0, -1).join('.'),
                ref.path.split('.').slice(-1).join('.'),
                'DUMMY',
            )
        ) {
            if (!ignoreStringTypes.includes(ref.path)) {
                return true;
            }
        }

        return false;
    }

    public matchesBuiltinTypePathRegex(path: string): string[] | undefined {
        for (const item of this.builtinTypeRegexes) {
            if (item.regex.exec(path)) {
                return item.values;
            }
        }
        return;
    }

    private matchesBuiltinTypeRegex(path: string, key: string): boolean {
        for (const item of this.builtinTypeRegexes) {
            if (item.regex.exec(path) && item.values.includes(key)) {
                return true;
            }
        }

        return false;
    }

    private checkForIgnoredType(path: string): boolean {
        if (ignoreTypes.includes(path)) {
            return true;
        }

        for (const re of this.ignoreTypesRegexes) {
            if (re.exec(path)) {
                return true;
            }
        }

        return false;
    }

    private loadRegexes() {
        for (const type in builtinTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.builtinTypeRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    values: builtinTypes[type],
                });

                delete builtinResourceIds[type];
            }
        }

        for (const type of stringTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.stringTypeRegexes.push(new RegExp(type.slice(1, -1)));
            }
        }

        for (const type of ignoreTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.ignoreTypesRegexes.push(new RegExp(type.slice(1, -1)));
            }
        }
    }
}
