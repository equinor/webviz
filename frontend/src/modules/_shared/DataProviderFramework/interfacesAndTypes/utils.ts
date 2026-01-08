import type { Settings, SettingTypeDefinitions } from "../settings/settingsDefinitions";

export type TupleIndices<T extends readonly any[]> = Extract<keyof T, `${number}`>;
export type SettingsKeysFromTuple<TSettings extends Settings> = TSettings[TupleIndices<TSettings>];

export type MakeSettingTypesMap<
    T extends readonly (keyof SettingTypeDefinitions)[],
    AllowNull extends boolean = false,
> =
    IsStrictlyAny<T> extends true
        ? any
        : {
              [K in T[number]]: AllowNull extends false
                  ? SettingTypeDefinitions[K]["externalValue"]
                  : SettingTypeDefinitions[K]["externalValue"] | null;
          };

// From: https://stackoverflow.com/a/50375286/62076
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// If T is `any` a union of both side of the condition is returned.
type UnionForAny<T> = T extends never ? "A" : "B";

// Returns true if type is any, or false for any other type.
type IsStrictlyAny<T> = UnionToIntersection<UnionForAny<T>> extends never ? true : false;
