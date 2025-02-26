import { SurfaceStatisticFunction_api, WellboreHeader_api } from "@api";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";

import { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

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

export type NonOptionalSettingTypes = {
    [SettingType.ATTRIBUTE]: string;
    [SettingType.ENSEMBLE]: RegularEnsembleIdent;
    [SettingType.GRID_LAYER_I_RANGE]: [number, number];
    [SettingType.GRID_LAYER_J_RANGE]: [number, number];
    [SettingType.GRID_LAYER_K]: number;
    [SettingType.GRID_LAYER_K_RANGE]: [number, number];
    [SettingType.GRID_NAME]: string;
    [SettingType.INTERSECTION]: IntersectionSettingValue;
    [SettingType.POLYGONS_ATTRIBUTE]: string;
    [SettingType.POLYGONS_NAME]: string;
    [SettingType.REALIZATION]: number;
    [SettingType.SEISMIC_CROSSLINE]: number;
    [SettingType.SEISMIC_DEPTH_SLICE]: number;
    [SettingType.SEISMIC_INLINE]: number;
    [SettingType.SENSITIVITY]: SensitivityNameCasePair;
    [SettingType.SHOW_GRID_LINES]: boolean;
    [SettingType.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[];
    [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [SettingType.SURFACE_NAME]: string;
    [SettingType.TIME_OR_INTERVAL]: string;
};

export type AllSettingTypes = {
    [K in keyof NonOptionalSettingTypes]: NonOptionalSettingTypes[K] | null;
};

export type SettingTypes<T extends (keyof NonOptionalSettingTypes)[]> = {
    [K in T[number]]: NonOptionalSettingTypes[K];
};
