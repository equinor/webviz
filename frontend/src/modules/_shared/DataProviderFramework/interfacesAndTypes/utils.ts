import type {
    Setting,
    SettingCategories,
    SettingCategory,
    SettingTypes,
    Settings,
} from "../settings/settingsDefinitions";

// Required when making "AvailableValuesType" for all settings in an object ("TSettings")
export type EachAvailableValuesType<TSetting> = TSetting extends Setting ? AvailableValuesType<TSetting> : never;

// Returns an array of "TValue" if the "TValue" itself is not already an array
export type AvailableValuesType<TSetting extends Setting> = MakeAvailableValuesTypeBasedOnCategory<
    SettingTypes[TSetting],
    SettingCategories[TSetting]
>;

export type MakeAvailableValuesTypeBasedOnCategory<TValue, TCategory extends SettingCategory> = TCategory extends
    | SettingCategory.SINGLE_SELECT
    | SettingCategory.MULTI_SELECT
    ? RemoveUnknownFromArray<MakeArrayIfNotArray<TValue>>
    : TCategory extends SettingCategory.NUMBER
      ? [Exclude<TValue, null>, Exclude<TValue, null>]
      : TCategory extends SettingCategory.XYZ_RANGE
        ? [[number, number, number], [number, number, number], [number, number, number]]
        : TCategory extends SettingCategory.NUMBER_WITH_STEP
          ? [number, number, number]
          : TCategory extends SettingCategory.XYZ_VALUES_WITH_VISIBILITY
            ? [[number, number, number], [number, number, number], [number, number, number]]
            : never;

export type TupleIndices<T extends readonly any[]> = Extract<keyof T, `${number}`>;
export type SettingsKeysFromTuple<TSettings extends Settings> = TSettings[TupleIndices<TSettings>];

// "MakeArrayIfNotArray<T>" yields "unknown[] | any[]" for "T = any"  - we don't want "unknown[]"
type RemoveUnknownFromArray<T> = T extends (infer U)[] ? ([unknown] extends [U] ? any[] : T) : T;
type MakeArrayIfNotArray<T> = Exclude<T, null> extends Array<infer V> ? Array<V> : Array<Exclude<T, null>>;
