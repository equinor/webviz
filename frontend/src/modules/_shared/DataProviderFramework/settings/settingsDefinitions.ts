import { isEqual } from "lodash";

import type { SurfaceStatisticFunction_api, WellboreHeader_api } from "@api";
import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";

import type { AvailableValuesType } from "../interfacesAndTypes/utils";

import type { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import type { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

export enum SettingCategory {
    SINGLE_SELECT = "singleSelect",
    MULTI_SELECT = "multiSelect",
    NUMBER = "number",
    RANGE = "range",
    XYZ_NUMBER = "xyzNumber",
    XYZ_RANGE = "xyzRange",
    BOOLEAN = "boolean",
    STATIC = "static",
}

export enum Setting {
    ATTRIBUTE = "attribute",
    ENSEMBLE = "ensemble",
    COLOR_SCALE = "colorScale",
    COLOR_SET = "colorSet",
    GRID_LAYER_RANGE = "gridLayerRange",
    GRID_LAYER_K = "gridLayerK",
    GRID_NAME = "gridName",
    INTERSECTION = "intersection",
    POLYGONS_ATTRIBUTE = "polygonsAttribute",
    POLYGONS_NAME = "polygonsName",
    POLYLINES = "polylines",
    REALIZATION = "realization",
    SEISMIC_SLICES = "seismicSlices",
    SENSITIVITY = "sensitivity",
    SHOW_GRID_LINES = "showGridLines",
    SMDA_WELLBORE_HEADERS = "smdaWellboreHeaders",
    SMDA_WELLBORE_PICKS = "smdaWellborePicks",
    STATISTIC_FUNCTION = "statisticFunction",
    SURFACE_NAME = "surfaceName",
    TIME_OR_INTERVAL = "timeOrInterval",
    OMIT_RANGE = "omitRange",
    OMIT_COLOR = "omitColor",
}

export const settingCategories = {
    [Setting.ATTRIBUTE]: SettingCategory.SINGLE_SELECT,
    [Setting.ENSEMBLE]: SettingCategory.SINGLE_SELECT,
    [Setting.COLOR_SCALE]: SettingCategory.STATIC,
    [Setting.COLOR_SET]: SettingCategory.STATIC,
    [Setting.GRID_LAYER_RANGE]: SettingCategory.XYZ_RANGE,
    [Setting.GRID_LAYER_K]: SettingCategory.NUMBER,
    [Setting.GRID_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.INTERSECTION]: SettingCategory.SINGLE_SELECT,
    [Setting.OMIT_RANGE]: SettingCategory.RANGE,
    [Setting.POLYGONS_ATTRIBUTE]: SettingCategory.SINGLE_SELECT,
    [Setting.POLYGONS_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.POLYLINES]: SettingCategory.MULTI_SELECT,
    [Setting.REALIZATION]: SettingCategory.SINGLE_SELECT,
    [Setting.SEISMIC_SLICES]: SettingCategory.XYZ_NUMBER,
    [Setting.SENSITIVITY]: SettingCategory.SINGLE_SELECT,
    [Setting.SHOW_GRID_LINES]: SettingCategory.BOOLEAN,
    [Setting.SMDA_WELLBORE_HEADERS]: SettingCategory.MULTI_SELECT,
    [Setting.SMDA_WELLBORE_PICKS]: SettingCategory.MULTI_SELECT,
    [Setting.STATISTIC_FUNCTION]: SettingCategory.SINGLE_SELECT,
    [Setting.SURFACE_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.TIME_OR_INTERVAL]: SettingCategory.SINGLE_SELECT,
    [Setting.OMIT_COLOR]: SettingCategory.STATIC,
} as const;

export type SettingCategories = typeof settingCategories;

export type SettingTypes = {
    [Setting.ATTRIBUTE]: string | null;
    [Setting.ENSEMBLE]: RegularEnsembleIdent | null;
    [Setting.COLOR_SCALE]: ColorScaleSpecification | null;
    [Setting.COLOR_SET]: ColorSet | null;
    [Setting.GRID_LAYER_RANGE]: [[number, number], [number, number], [number, number]] | null;
    [Setting.GRID_LAYER_K]: number | null;
    [Setting.GRID_NAME]: string | null;
    [Setting.INTERSECTION]: IntersectionSettingValue | null;
    [Setting.OMIT_RANGE]: [number, number] | null;
    [Setting.POLYGONS_ATTRIBUTE]: string | null;
    [Setting.POLYGONS_NAME]: string | null;
    [Setting.POLYLINES]: { value: string; label: string }[] | null;
    [Setting.REALIZATION]: number | null;
    [Setting.SEISMIC_SLICES]: [number, number, number] | null;
    [Setting.SENSITIVITY]: SensitivityNameCasePair | null;
    [Setting.SHOW_GRID_LINES]: boolean;
    [Setting.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
    [Setting.SMDA_WELLBORE_PICKS]: string[] | null;
    [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [Setting.SURFACE_NAME]: string | null;
    [Setting.TIME_OR_INTERVAL]: string | null;
    [Setting.OMIT_COLOR]: string | null;
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
        isValid: (availableValues: AvailableValuesType<PossibleSettingsForCategory<K>>) => boolean;
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
    [SettingCategory.RANGE]: <TSetting extends PossibleSettingsForCategory<SettingCategory.RANGE>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
        if (value === null) {
            return [availableValues[0], availableValues[1]];
        }

        const [min, max] = availableValues;

        const newValue: SettingTypes[TSetting] = [Math.max(min, value[0]), Math.min(max, value[1])];
        return newValue;
    },
    [SettingCategory.XYZ_NUMBER]: <TSetting extends PossibleSettingsForCategory<SettingCategory.XYZ_NUMBER>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
        if (value === null) {
            return [availableValues[0][0], availableValues[1][0], availableValues[2][0]];
        }

        const [xRange, yRange, zRange] = availableValues;

        const newValue: SettingTypes[TSetting] = [
            Math.max(xRange[0], Math.min(xRange[1], value[0])),
            Math.max(yRange[0], Math.min(yRange[1], value[1])),
            Math.max(zRange[0], Math.min(zRange[1], value[2])),
        ];
        return newValue;
    },
    [SettingCategory.XYZ_RANGE]: <TSetting extends PossibleSettingsForCategory<SettingCategory.XYZ_RANGE>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
        if (value === null) {
            return [
                [availableValues[0][0], availableValues[0][1]],
                [availableValues[1][0], availableValues[1][1]],
                [availableValues[2][0], availableValues[2][1]],
            ];
        }

        const [xRange, yRange, zRange] = availableValues;

        const newValue: SettingTypes[TSetting] = [
            [Math.max(xRange[0], value[0][0]), Math.min(xRange[1], value[0][1])],
            [Math.max(yRange[0], value[1][0]), Math.min(yRange[1], value[1][1])],
            [Math.max(zRange[0], value[2][0]), Math.min(zRange[1], value[2][1])],
        ];
        return newValue;
    },
    [SettingCategory.STATIC]: (value) => value,
    [SettingCategory.BOOLEAN]: (value) => value,
};

type T = AvailableValuesType<Setting.GRID_LAYER_RANGE>;

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
    [SettingCategory.RANGE]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [min, max] = availableValues;
        return value[0] >= min && value[0] <= max && value[1] >= min && value[1] <= max;
    },
    [SettingCategory.XYZ_NUMBER]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [xRange, yRange, zRange] = availableValues;
        return (
            value[0] >= xRange[0] &&
            value[0] <= xRange[1] &&
            value[1] >= yRange[0] &&
            value[1] <= yRange[1] &&
            value[2] >= zRange[0] &&
            value[2] <= zRange[1]
        );
    },
    [SettingCategory.XYZ_RANGE]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [xRange, yRange, zRange] = availableValues;
        return (
            value[0][0] >= xRange[0] &&
            value[0][0] <= xRange[1] &&
            value[0][1] >= xRange[0] &&
            value[0][1] <= xRange[1] &&
            value[1][0] >= yRange[0] &&
            value[1][0] <= yRange[1] &&
            value[1][1] >= yRange[0] &&
            value[1][1] <= yRange[1] &&
            value[2][0] >= zRange[0] &&
            value[2][0] <= zRange[1] &&
            value[2][1] >= zRange[0] &&
            value[2][1] <= zRange[1]
        );
    },
    [SettingCategory.STATIC]: () => true,
    [SettingCategory.BOOLEAN]: () => true,
};

export const settingCategoryAvailableValuesIntersectionReducerMap: SettingCategoryAvailableValuesIntersectionReducerMap =
    {
        [SettingCategory.SINGLE_SELECT]: {
            reducer: (accumulator, currentAvailableValues, index) => {
                if (index === 0) {
                    return currentAvailableValues;
                }
                return accumulator.filter((value) => currentAvailableValues.some((av) => isEqual(av, value)));
            },
            startingValue: [],
            isValid: (availableValues) => availableValues.length > 0,
        },
        [SettingCategory.MULTI_SELECT]: {
            reducer: (accumulator, currentAvailableValues, index) => {
                if (index === 0) {
                    return currentAvailableValues;
                }
                return accumulator.filter((value) => currentAvailableValues.some((av) => isEqual(av, value)));
            },
            startingValue: [],
            isValid: (availableValues) => availableValues.length > 0,
        },
        [SettingCategory.NUMBER]: {
            reducer: (accumulator, currentAvailableValues) => {
                const [min, max] = accumulator;
                const [currentMin, currentMax] = currentAvailableValues;

                return [Math.max(min, currentMin), Math.min(max, currentMax)];
            },
            startingValue: [-Number.MAX_VALUE, Number.MAX_VALUE],
            isValid: (availableValues) => availableValues[0] < availableValues[1],
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
