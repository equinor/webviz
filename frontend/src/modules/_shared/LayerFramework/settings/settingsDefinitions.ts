import { SurfaceStatisticFunction_api, WellboreHeader_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorScaleConfig } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import { ColorSet } from "@lib/utils/ColorSet";

import { isEqual } from "lodash";

import { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

import { AvailableValuesType } from "../interfacesAndTypes/utils";

export enum SettingCategory {
    SINGLE_OPTION = "singleOption",
    MULTI_OPTION = "multiOption",
    NUMBER = "number",
    RANGE = "range",
    NUMBER_WITH_STEP = "numberWithStep",
    BOOLEAN = "boolean",
    STATIC = "static",
}

export enum Setting {
    ATTRIBUTE = "attribute",
    ENSEMBLE = "ensemble",
    COLOR_SCALE = "colorScale",
    COLOR_SET = "colorSet",
    GRID_LAYER_I_RANGE = "gridLayerIRange",
    GRID_LAYER_J_RANGE = "gridLayerJRange",
    GRID_LAYER_K = "gridLayerK",
    GRID_LAYER_K_RANGE = "gridLayerKRange",
    GRID_NAME = "gridName",
    INTERSECTION = "intersection",
    POLYGONS_ATTRIBUTE = "polygonsAttribute",
    POLYGONS_NAME = "polygonsName",
    REALIZATION = "realization",
    SEISMIC_CROSSLINE = "seismicCrossline",
    SEISMIC_DEPTH_SLICE = "seismicDepthSlice",
    SEISMIC_INLINE = "seismicInline",
    SENSITIVITY = "sensitivity",
    SHOW_GRID_LINES = "showGridLines",
    SMDA_WELLBORE_HEADERS = "smdaWellboreHeaders",
    STATISTIC_FUNCTION = "statisticFunction",
    SURFACE_NAME = "surfaceName",
    TIME_OR_INTERVAL = "timeOrInterval",
}

export const settingCategories = {
    [Setting.ATTRIBUTE]: SettingCategory.SINGLE_OPTION,
    [Setting.ENSEMBLE]: SettingCategory.SINGLE_OPTION,
    [Setting.COLOR_SCALE]: SettingCategory.STATIC,
    [Setting.COLOR_SET]: SettingCategory.STATIC,
    [Setting.GRID_LAYER_I_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_LAYER_J_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_LAYER_K]: SettingCategory.NUMBER,
    [Setting.GRID_LAYER_K_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_NAME]: SettingCategory.SINGLE_OPTION,
    [Setting.INTERSECTION]: SettingCategory.SINGLE_OPTION,
    [Setting.POLYGONS_ATTRIBUTE]: SettingCategory.SINGLE_OPTION,
    [Setting.POLYGONS_NAME]: SettingCategory.SINGLE_OPTION,
    [Setting.REALIZATION]: SettingCategory.SINGLE_OPTION,
    [Setting.SEISMIC_CROSSLINE]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SEISMIC_DEPTH_SLICE]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SEISMIC_INLINE]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SENSITIVITY]: SettingCategory.SINGLE_OPTION,
    [Setting.SHOW_GRID_LINES]: SettingCategory.BOOLEAN,
    [Setting.SMDA_WELLBORE_HEADERS]: SettingCategory.MULTI_OPTION,
    [Setting.STATISTIC_FUNCTION]: SettingCategory.SINGLE_OPTION,
    [Setting.SURFACE_NAME]: SettingCategory.SINGLE_OPTION,
    [Setting.TIME_OR_INTERVAL]: SettingCategory.SINGLE_OPTION,
} as const;

export type SettingCategories = typeof settingCategories;

export type SettingTypes = {
    [Setting.ATTRIBUTE]: string | null;
    [Setting.ENSEMBLE]: RegularEnsembleIdent | null;
    [Setting.COLOR_SCALE]: ColorScaleConfig | null;
    [Setting.COLOR_SET]: ColorSet | null;
    [Setting.GRID_LAYER_I_RANGE]: [number, number] | null;
    [Setting.GRID_LAYER_J_RANGE]: [number, number] | null;
    [Setting.GRID_LAYER_K]: number | null;
    [Setting.GRID_LAYER_K_RANGE]: [number, number] | null;
    [Setting.GRID_NAME]: string | null;
    [Setting.INTERSECTION]: IntersectionSettingValue | null;
    [Setting.POLYGONS_ATTRIBUTE]: string | null;
    [Setting.POLYGONS_NAME]: string | null;
    [Setting.REALIZATION]: number | null;
    [Setting.SEISMIC_CROSSLINE]: number | null;
    [Setting.SEISMIC_DEPTH_SLICE]: number | null;
    [Setting.SEISMIC_INLINE]: number | null;
    [Setting.SENSITIVITY]: SensitivityNameCasePair | null;
    [Setting.SHOW_GRID_LINES]: boolean;
    [Setting.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
    [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [Setting.SURFACE_NAME]: string | null;
    [Setting.TIME_OR_INTERVAL]: string | null;
};

export type PossibleSettingsForCategory<TCategory extends SettingCategory> = {
    [K in keyof SettingTypes]: SettingCategories[K] extends TCategory ? K : never;
}[keyof SettingTypes];

interface FixupCategoryValue<
    TCategory extends SettingCategory,
    TValue = SettingTypes[PossibleSettingsForCategory<TCategory>]
> {
    (value: TValue, availableValues: AvailableValuesType<PossibleSettingsForCategory<TCategory>>): TValue;
}

type SettingCategoryFixupMap = {
    [K in SettingCategory]: FixupCategoryValue<K>;
};

interface CheckIfCategoryValueIsValid<
    TCategory extends SettingCategory,
    TValue = SettingTypes[PossibleSettingsForCategory<TCategory>]
> {
    (value: TValue, availableValues: AvailableValuesType<PossibleSettingsForCategory<TCategory>>): boolean;
}

type SettingCategoryIsValueValidMap = {
    [K in SettingCategory]: CheckIfCategoryValueIsValid<K>;
};

interface AvailableValuesIntersectionReducer<TCategory extends SettingCategory> {
    (
        accumulator: AvailableValuesType<PossibleSettingsForCategory<TCategory>>,
        currentAvailableValues: AvailableValuesType<PossibleSettingsForCategory<TCategory>>,
        currentIndex: number
    ): AvailableValuesType<PossibleSettingsForCategory<TCategory>>;
}

type SettingCategoryAvailableValuesIntersectionReducerMap = {
    [K in SettingCategory]?: {
        reducer: AvailableValuesIntersectionReducer<K>;
        startingValue: AvailableValuesType<PossibleSettingsForCategory<K>>;
    };
};

export const settingCategoryFixupMap: SettingCategoryFixupMap = {
    [SettingCategory.SINGLE_OPTION]: (value, availableValues) => {
        if (availableValues.length === 0) {
            return null;
        }

        if (value === null) {
            return availableValues[0];
        }

        if (availableValues.some((v) => isEqual(v, value))) {
            return value;
        }

        return availableValues[0];
    },
    [SettingCategory.MULTI_OPTION]: (value, availableValues) => {
        if (availableValues.length === 0) {
            return [];
        }

        if (value === null) {
            return [availableValues[0]];
        }

        return value.filter((v) => availableValues.some((av) => isEqual(av, v)));
    },
    [SettingCategory.NUMBER]: (value, availableValues) => {
        if (value === null) {
            return availableValues[0];
        }

        const [min, max] = availableValues;

        if (value < min) {
            return min;
        }

        if (value > max) {
            return max;
        }

        return value;
    },
    [SettingCategory.NUMBER_WITH_STEP]: (value, availableValues) => {
        if (value === null) {
            return availableValues[0];
        }

        const [min, max, step] = availableValues;

        if (value < min) {
            return min;
        }

        if (value > max) {
            return max;
        }

        const steps = Math.round((value - min) / step);
        return min + steps * step;
    },
    [SettingCategory.RANGE]: (value, availableValues) => {
        if (value === null) {
            return availableValues;
        }

        const [min, max] = availableValues;

        if (value[0] < min) {
            value[0] = min;
        }

        if (value[1] > max) {
            value[1] = max;
        }

        return value;
    },
    [SettingCategory.STATIC]: (value) => value,
    [SettingCategory.BOOLEAN]: (value) => value,
};

export const settingCategoryIsValueValidMap: SettingCategoryIsValueValidMap = {
    [SettingCategory.SINGLE_OPTION]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        return availableValues.some((v) => isEqual(v, value));
    },
    [SettingCategory.MULTI_OPTION]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        return value.every((v) => availableValues.some((av) => isEqual(av, v)));
    },
    [SettingCategory.NUMBER]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [min, max] = availableValues;
        return value >= min && value <= max;
    },
    [SettingCategory.NUMBER_WITH_STEP]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [min, max, step] = availableValues;
        return value >= min && value <= max && (value - min) % step === 0;
    },
    [SettingCategory.RANGE]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [min, max] = availableValues;
        return value[0] >= min && value[1] <= max;
    },
    [SettingCategory.STATIC]: () => true,
    [SettingCategory.BOOLEAN]: () => true,
};

export const settingCategoryAvailableValuesIntersectionReducerMap: SettingCategoryAvailableValuesIntersectionReducerMap =
    {
        [SettingCategory.SINGLE_OPTION]: {
            reducer: (accumulator, currentAvailableValues) => {
                if (accumulator.length === 0) {
                    return currentAvailableValues;
                }
                return accumulator.filter((value) => currentAvailableValues.some((av) => isEqual(av, value)));
            },
            startingValue: [],
        },
        [SettingCategory.MULTI_OPTION]: {
            reducer: (accumulator, currentAvailableValues) => {
                if (accumulator.length === 0) {
                    return currentAvailableValues;
                }
                return accumulator.filter((value) => currentAvailableValues.some((av) => isEqual(av, value)));
            },
            startingValue: [],
        },
        [SettingCategory.NUMBER]: {
            reducer: (accumulator, currentAvailableValues) => {
                const [min, max] = accumulator;
                const [currentMin, currentMax] = currentAvailableValues;

                return [Math.max(min, currentMin), Math.min(max, currentMax)];
            },
            startingValue: [Number.MIN_VALUE, Number.MAX_VALUE],
        },
        [SettingCategory.RANGE]: {
            reducer: (accumulator, currentAvailableValues) => {
                const [min, max] = accumulator;
                const [currentMin, currentMax] = currentAvailableValues;

                return [Math.max(min, currentMin), Math.min(max, currentMax)];
            },
            startingValue: [Number.MIN_VALUE, Number.MAX_VALUE],
        },
    };

// From: https://stackoverflow.com/a/50375286/62076
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// If T is `any` a union of both side of the condition is returned.
type UnionForAny<T> = T extends never ? "A" : "B";

// Returns true if type is any, or false for any other type.
type IsStrictlyAny<T> = UnionToIntersection<UnionForAny<T>> extends never ? true : false;

export type MakeSettingTypesMap<
    T extends readonly (keyof SettingTypes)[],
    AllowNull extends boolean = false
> = IsStrictlyAny<T> extends true
    ? any
    : {
          [K in T[number]]: AllowNull extends false ? SettingTypes[K] : SettingTypes[K] | null;
      };

export type Settings = ReadonlyArray<Setting> & { __brand?: "MyType" };
