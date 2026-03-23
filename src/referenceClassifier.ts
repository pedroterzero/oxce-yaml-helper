import { Match } from './rulesetTree';
import { cachedConfig } from './cachedConfiguration';
import { builtinResourceIds, builtinTypes } from './definitions/builtinTypes';
import { ignoreTypes } from './definitions/ignoreTypes';
import { ignoreStringTypes, stringTypes } from './definitions/stringTypes';
import { typedProperties } from './typedProperties';

export class ReferenceClassifier {
    private builtinTypeRegexes: { regex: RegExp; values: Set<string> }[] = [];
    private stringTypeRegexes: RegExp[] = [];
    private ignoreTypesRegexes: RegExp[] = [];
    private stringTypesSet = new Set<string>();
    private ignoreTypesSet = new Set<string>();
    private ignoreStringTypesSet = new Set<string>();

    // Per-path regex result caches (cleared implicitly on new instance)
    private deletePatternCache = new Map<string, boolean>();
    private ignoreTypeCache = new Map<string, boolean>();
    private stringTypeCache = new Map<string, boolean>();
    private builtinPathMatchCache = new Map<string, Set<string> | undefined>();

    public constructor() {
        this.loadRegexes();
    }

    /**
     * Returns true if the reference should be checked (i.e. is NOT a known skip case).
     */
    public typeExists(ref: Match): boolean {
        let isDelete = this.deletePatternCache.get(ref.path);
        if (isDelete === undefined) {
            isDelete = /^[a-z]+\.delete$/i.test(ref.path);
            this.deletePatternCache.set(ref.path, isDelete);
        }
        if (isDelete) {
            return false;
        }
        if (ref.path.startsWith('extraStrings.') || ref.path.startsWith('extended.scripts.')) {
            return false;
        }
        if (this.checkForIgnoredType(ref.path)) {
            return false;
        }
        if (!cachedConfig.findMissingTranslations && this.isExtraStringType(ref.path)) {
            return false;
        }
        if (ref.path in builtinTypes && builtinTypes[ref.path].indexOf(ref.key) !== -1) {
            return false;
        } else if (this.matchesBuiltinTypeRegex(ref.path, ref.key)) {
            return false;
        }

        if (ref.path in builtinResourceIds) {
            const [min, max] = builtinResourceIds[ref.path];
            if (parseInt(ref.key) >= min && parseInt(ref.key) <= max) {
                return false;
            }
        }

        return true;
    }

    public isExtraStringType(path: string): boolean {
        const cached = this.stringTypeCache.get(path);
        if (cached !== undefined) {
            return cached;
        }

        if (this.stringTypesSet.has(path)) {
            this.stringTypeCache.set(path, true);
            return true;
        }

        for (const regex of this.stringTypeRegexes) {
            if (regex.exec(path)) {
                this.stringTypeCache.set(path, true);
                return true;
            }
        }

        this.stringTypeCache.set(path, false);
        return false;
    }

    public isCheckableTranslatableString(ref: Match): boolean {
        if (!cachedConfig.findMissingTranslations) {
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
            if (!this.ignoreStringTypesSet.has(ref.path)) {
                return true;
            }
        }

        return false;
    }

    public matchesBuiltinTypePathRegex(path: string): string[] | undefined {
        const values = this.getBuiltinPathMatch(path);
        return values ? [...values] : undefined;
    }

    private matchesBuiltinTypeRegex(path: string, key: string): boolean {
        const values = this.getBuiltinPathMatch(path);
        return values !== undefined && values.has(key);
    }

    private getBuiltinPathMatch(path: string): Set<string> | undefined {
        if (this.builtinPathMatchCache.has(path)) {
            return this.builtinPathMatchCache.get(path);
        }
        for (const item of this.builtinTypeRegexes) {
            if (item.regex.exec(path)) {
                this.builtinPathMatchCache.set(path, item.values);
                return item.values;
            }
        }
        this.builtinPathMatchCache.set(path, undefined);
        return undefined;
    }

    private checkForIgnoredType(path: string): boolean {
        const cached = this.ignoreTypeCache.get(path);
        if (cached !== undefined) {
            return cached;
        }

        if (this.ignoreTypesSet.has(path)) {
            this.ignoreTypeCache.set(path, true);
            return true;
        }

        for (const re of this.ignoreTypesRegexes) {
            if (re.exec(path)) {
                this.ignoreTypeCache.set(path, true);
                return true;
            }
        }

        this.ignoreTypeCache.set(path, false);
        return false;
    }

    private loadRegexes() {
        for (const type in builtinTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.builtinTypeRegexes.push({
                    regex: new RegExp(type.slice(1, -1)),
                    values: new Set(builtinTypes[type]),
                });

                delete builtinResourceIds[type];
            }
        }

        for (const type of stringTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.stringTypeRegexes.push(new RegExp(type.slice(1, -1)));
            } else {
                this.stringTypesSet.add(type);
            }
        }

        for (const type of ignoreTypes) {
            if (type.startsWith('/') && type.endsWith('/')) {
                this.ignoreTypesRegexes.push(new RegExp(type.slice(1, -1)));
            } else {
                this.ignoreTypesSet.add(type);
            }
        }

        for (const type of ignoreStringTypes) {
            this.ignoreStringTypesSet.add(type);
        }
    }
}
