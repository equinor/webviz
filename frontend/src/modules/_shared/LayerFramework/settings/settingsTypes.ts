import { SurfaceStatisticFunction_api, WellboreHeader_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

import { Setting } from "../framework/Setting/Setting";

export enum SettingType {
    ATTRIBUTE = "attribute",
    ENSEMBLE = "ensemble",
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

export type SettingTypes = {
    [SettingType.ATTRIBUTE]: string | null;
    [SettingType.ENSEMBLE]: RegularEnsembleIdent | null;
    [SettingType.GRID_LAYER_I_RANGE]: [number, number] | null;
    [SettingType.GRID_LAYER_J_RANGE]: [number, number] | null;
    [SettingType.GRID_LAYER_K]: number | null;
    [SettingType.GRID_LAYER_K_RANGE]: [number, number] | null;
    [SettingType.GRID_NAME]: string | null;
    [SettingType.INTERSECTION]: IntersectionSettingValue | null;
    [SettingType.POLYGONS_ATTRIBUTE]: string | null;
    [SettingType.POLYGONS_NAME]: string | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.SEISMIC_CROSSLINE]: number | null;
    [SettingType.SEISMIC_DEPTH_SLICE]: number | null;
    [SettingType.SEISMIC_INLINE]: number | null;
    [SettingType.SENSITIVITY]: SensitivityNameCasePair | null;
    [SettingType.SHOW_GRID_LINES]: boolean;
    [SettingType.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
    [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
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

export type MakeSettingTuple<T extends readonly (keyof SettingTypes)[]> = {
    [K in keyof T]: Setting<SettingTypes[T[K]]>;
};
