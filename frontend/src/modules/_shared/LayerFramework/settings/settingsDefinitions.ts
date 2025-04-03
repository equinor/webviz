import type { SurfaceStatisticFunction_api, WellboreHeader_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import type { ColorSet } from "@lib/utils/ColorSet";

import { isEqual } from "lodash";

import type { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import type { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

import type { AvailableValuesType } from "../interfacesAndTypes/utils";

export enum SettingCategory {
    SINGLE_SELECT = "singleSelect",
    MULTI_SELECT = "multiSelect",
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
    SMDA_WELLBORE_PICKS = "smdaWellborePicks",
    STATISTIC_FUNCTION = "statisticFunction",
    SURFACE_NAME = "surfaceName",
    TIME_OR_INTERVAL = "timeOrInterval",
}

export const settingCategories = {
    [Setting.ATTRIBUTE]: SettingCategory.SINGLE_SELECT,
    [Setting.ENSEMBLE]: SettingCategory.SINGLE_SELECT,
    [Setting.COLOR_SCALE]: SettingCategory.STATIC,
    [Setting.COLOR_SET]: SettingCategory.STATIC,
    [Setting.GRID_LAYER_I_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_LAYER_J_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_LAYER_K]: SettingCategory.NUMBER,
    [Setting.GRID_LAYER_K_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.INTERSECTION]: SettingCategory.SINGLE_SELECT,
    [Setting.POLYGONS_ATTRIBUTE]: SettingCategory.SINGLE_SELECT,
    [Setting.POLYGONS_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.REALIZATION]: SettingCategory.SINGLE_SELECT,
    [Setting.SEISMIC_CROSSLINE]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SEISMIC_DEPTH_SLICE]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SEISMIC_INLINE]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SENSITIVITY]: SettingCategory.SINGLE_SELECT,
    [Setting.SHOW_GRID_LINES]: SettingCategory.BOOLEAN,
    [Setting.SMDA_WELLBORE_HEADERS]: SettingCategory.MULTI_SELECT,
    [Setting.SMDA_WELLBORE_PICKS]: SettingCategory.MULTI_SELECT,
    [Setting.STATISTIC_FUNCTION]: SettingCategory.SINGLE_SELECT,
    [Setting.SURFACE_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.TIME_OR_INTERVAL]: SettingCategory.SINGLE_SELECT,
} as const;

export type SettingCategories = typeof settingCategories;

export type SettingTypes = {
    [Setting.ATTRIBUTE]: string | null;
    [Setting.ENSEMBLE]: RegularEnsembleIdent | null;
    [Setting.COLOR_SCALE]: ColorScaleSpecification | null;
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
    [Setting.SMDA_WELLBORE_PICKS]: string[] | null;
    [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [Setting.SURFACE_NAME]: string | null;
    [Setting.TIME_OR_INTERVAL]: string | null;
};

export type PossibleSettingsForCategory<TCategory extends SettingCategory> = {
    [K in keyof SettingTypes]: SettingCategories[K] extends TCategory ? K : never;
}[keyof SettingTypes];

interface FixupCategoryValue<
    TCategory extends SettingCategory,
    TValue = SettingTypes[PossibleSettingsForCategory<TCategory>],
> {
    (value: TValue, availableValues: AvailableValuesType<PossibleSettingsForCategory<TCategory>>): TValue;
}

type SettingCategoryFixupMap = {
    [K in SettingCategory]: FixupCategoryValue<K>;
};

interface CheckIfCategoryValueIsValid<
    TCategory extends SettingCategory,
    TValue = SettingTypes[PossibleSettingsForCategory<TCategory>],
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
        currentIndex: number,
    ): AvailableValuesType<PossibleSettingsForCategory<TCategory>>;
}

type SettingCategoryAvailableValuesIntersectionReducerMap = {
    [K in SettingCategory]?: {
        reducer: AvailableValuesIntersectionReducer<K>;
        startingValue: AvailableValuesType<PossibleSettingsForCategory<K>>;
    };
};

export const settingCategoryFixupMap: SettingCategoryFixupMap = {
    [SettingCategory.SINGLE_SELECT]: <TSetting extends PossibleSettingsForCategory<SettingCategory.SINGLE_SELECT>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
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
    [SettingCategory.MULTI_SELECT]: <TSetting extends PossibleSettingsForCategory<SettingCategory.MULTI_SELECT>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
        if (availableValues.length === 0) {
            return [];
        }

        if (value === null) {
            return [availableValues[0]];
        }

        return value.filter((v) => availableValues.some((av) => isEqual(av, v)));
    },
    [SettingCategory.NUMBER]: <TSetting extends PossibleSettingsForCategory<SettingCategory.NUMBER>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
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
    [SettingCategory.NUMBER_WITH_STEP]: <
        TSetting extends PossibleSettingsForCategory<SettingCategory.NUMBER_WITH_STEP>,
    >(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
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
    [SettingCategory.RANGE]: <TSetting extends PossibleSettingsForCategory<SettingCategory.RANGE>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
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
    [SettingCategory.SINGLE_SELECT]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        return availableValues.some((v) => isEqual(v, value));
    },
    [SettingCategory.MULTI_SELECT]: (value, availableValues) => {
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
        [SettingCategory.SINGLE_SELECT]: {
            reducer: (accumulator, currentAvailableValues) => {
                if (accumulator.length === 0) {
                    return currentAvailableValues;
                }
                return accumulator.filter((value) => currentAvailableValues.some((av) => isEqual(av, value)));
            },
            startingValue: [],
        },
        [SettingCategory.MULTI_SELECT]: {
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

export type MakeSettingTypesMap<T extends readonly (keyof SettingTypes)[], AllowNull extends boolean = false> =
    IsStrictlyAny<T> extends true
        ? any
        : {
              [K in T[number]]: AllowNull extends false ? SettingTypes[K] : SettingTypes[K] | null;
          };

export type Settings = ReadonlyArray<Setting> & { __brand?: "MyType" };
