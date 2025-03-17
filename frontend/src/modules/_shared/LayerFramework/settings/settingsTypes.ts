import { SurfaceStatisticFunction_api, WellboreHeader_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { ColorScaleConfig } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import { ColorSet } from "@lib/utils/ColorSet";

import { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

export enum SettingCategory {
    OPTION = "option",
    NUMBER = "number",
    RANGE = "range",
    OTHER = "other",
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
    [Setting.ATTRIBUTE]: SettingCategory.OPTION,
    [Setting.ENSEMBLE]: SettingCategory.OPTION,
    [Setting.COLOR_SCALE]: SettingCategory.OTHER,
    [Setting.COLOR_SET]: SettingCategory.OTHER,
    [Setting.GRID_LAYER_I_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_LAYER_J_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_LAYER_K]: SettingCategory.NUMBER,
    [Setting.GRID_LAYER_K_RANGE]: SettingCategory.RANGE,
    [Setting.GRID_NAME]: SettingCategory.OPTION,
    [Setting.INTERSECTION]: SettingCategory.OPTION,
    [Setting.POLYGONS_ATTRIBUTE]: SettingCategory.OPTION,
    [Setting.POLYGONS_NAME]: SettingCategory.OPTION,
    [Setting.REALIZATION]: SettingCategory.OPTION,
    [Setting.SEISMIC_CROSSLINE]: SettingCategory.OPTION,
    [Setting.SEISMIC_DEPTH_SLICE]: SettingCategory.OPTION,
    [Setting.SEISMIC_INLINE]: SettingCategory.OPTION,
    [Setting.SENSITIVITY]: SettingCategory.OPTION,
    [Setting.SHOW_GRID_LINES]: SettingCategory.OTHER,
    [Setting.SMDA_WELLBORE_HEADERS]: SettingCategory.OPTION,
    [Setting.STATISTIC_FUNCTION]: SettingCategory.OPTION,
    [Setting.SURFACE_NAME]: SettingCategory.OPTION,
    [Setting.TIME_OR_INTERVAL]: SettingCategory.OPTION,
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
