import type { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import type {
    Grid3dZone_api,
    SurfaceStatisticFunction_api,
    WellboreHeader_api,
    WellboreLogCurveHeader_api,
    WellborePick_api,
} from "@api";
import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ColorSet } from "@lib/utils/ColorSet";

import type { IntersectionSettingValue } from "./implementations/IntersectionSetting";
import type { PolygonVisualizationSpec } from "./implementations/PolygonVisualizationSetting";
import type { Representation } from "./implementations/RepresentationSetting";
import type { SensitivityNameCasePair } from "./implementations/SensitivitySetting";

export enum Setting {
    // Assorted styling visual settings
    SHOW_LABELS = "showLabels",
    LABEL_ROTATION = "labelRotation",
    SHOW_LINES = "showLines",
    TRACK_WIDTH = "trackWidth",
    SCALE = "scale",

    LOG_CURVE = "logCurve",
    PLOT_VARIANT = "plotVariant",
    DEPTH_ATTRIBUTE = "depthAttribute",
    SEISMIC_ATTRIBUTE = "seismicAttribute",
    WELLBORE_DEPTH_FILTER_ATTRIBUTE = "wellboreDepthFilterAttribute",
    ATTRIBUTE = "attribute",
    ENSEMBLE = "ensemble",
    COLOR_SCALE = "colorScale",
    DEPTH_COLOR_SCALE = "depthColorScale",
    SEISMIC_COLOR_SCALE = "seismicColorScale",
    COLOR_SET = "colorSet",
    COLOR = "color",
    CONTOURS = "contours",
    GRID_LAYER_RANGE = "gridLayerRange",
    GRID_LAYER_K = "gridLayerK",
    GRID_NAME = "gridName",
    INTERSECTION = "intersection",
    MD_RANGE = "mdRange",
    OPACITY_PERCENT = "opacityPercent",
    POLYGONS_ATTRIBUTE = "polygonsAttribute",
    POLYGONS_NAME = "polygonsName",
    POLYGON_VISUALIZATION = "polygonVisualization",
    REALIZATION = "realization",
    STRAT_COLUMN = "stratColumn",
    REALIZATIONS = "realizations",
    SAMPLE_RESOLUTION_IN_METERS = "sampleResolutionInMeters",
    SEISMIC_SLICES = "seismicSlices",
    SENSITIVITY = "sensitivity",
    SHOW_GRID_LINES = "showGridLines",
    SMDA_INTERPRETER = "smdaInterpreter",
    WELLBORES = "wellbores",
    STATISTIC_FUNCTION = "statisticFunction",
    SURFACE_NAME = "surfaceName",
    FORMATION_NAME = "formationName",
    SURFACE_NAMES = "surfaceNames",
    TIME_OR_INTERVAL = "timeOrInterval",
    TIME_POINT = "timePoint",
    TIME_INTERVAL = "timeInterval",
    TIME_RANGE_WITH_POINTS = "timeRangeWithPoints",
    TVD_RANGE = "tvdRange",
    WELLBORE_DEPTH_FORMATION_FILTER = "wellboreDepthFormationFilter",
    WELLBORE_DEPTH_FILTER_TYPE = "wellboreDepthFilterType",
    WELLBORE_EXTENSION_LENGTH = "wellboreExtensionLength",
    WELLBORE_PICKS = "wellborePicks",
    WELLBORE_PICK_IDENTIFIER = "wellborePickIdentifier",
    REPRESENTATION = "representation",
    PDM_FILTER_TYPE = "pdmFilterType",
    PDM_FILTER = "pdmFilter",
}

/**
 * Defines the structure of each setting type using a three-part value system:
 *
 * - internalValue: The value stored internally (preserves user intent/selection details)
 * - externalValue: The value exposed to external consumers (simplified/derived form)
 * - valueRange: The selection space/boundaries that define what users can choose from
 *
 * For most settings, internalValue and externalValue are the same type. For complex settings
 * like GRID_LAYER_RANGE, they differ to preserve additional state information internally.
 */

export type SettingTypeDefinitions = {
    // Boolean settings (BOOLEAN category) - no valueRange
    [Setting.SHOW_LABELS]: {
        internalValue: boolean;
        externalValue: boolean;
        valueRange: null;
    };
    [Setting.SHOW_LINES]: {
        internalValue: boolean;
        externalValue: boolean;
        valueRange: null;
    };
    [Setting.SHOW_GRID_LINES]: {
        internalValue: boolean;
        externalValue: boolean;
        valueRange: null;
    };

    // Number settings (NUMBER category) - valueRange is [min, max]
    [Setting.TRACK_WIDTH]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: [number, number];
    };
    [Setting.GRID_LAYER_K]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: [number, number];
    };
    [Setting.SAMPLE_RESOLUTION_IN_METERS]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: [number, number];
    };
    [Setting.WELLBORE_EXTENSION_LENGTH]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: [number, number];
    };

    // Number with step settings (NUMBER_WITH_STEP category) - valueRange is [min, max, step]
    [Setting.LABEL_ROTATION]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: [number, number, number];
    };
    [Setting.OPACITY_PERCENT]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: [number, number, number];
    };

    // Range settings (RANGE category) - valueRange is [min, max, step]
    [Setting.MD_RANGE]: {
        internalValue: [number | "min", number | "max"] | null;
        externalValue: [number, number] | null;
        valueRange: [number, number, number];
    };
    [Setting.TVD_RANGE]: {
        internalValue: [number | "min", number | "max"] | null;
        externalValue: [number, number] | null;
        valueRange: [number, number, number];
    };

    // Single select string settings (SINGLE_SELECT category)
    [Setting.SCALE]: {
        internalValue: "linear" | "log" | null;
        externalValue: "linear" | "log" | null;
        valueRange: ("linear" | "log")[];
    };
    [Setting.ATTRIBUTE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.DEPTH_ATTRIBUTE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.SEISMIC_ATTRIBUTE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.WELLBORE_DEPTH_FILTER_ATTRIBUTE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.GRID_NAME]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.POLYGONS_ATTRIBUTE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.POLYGONS_NAME]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.SMDA_INTERPRETER]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.STRAT_COLUMN]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.SURFACE_NAME]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.FORMATION_NAME]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.TIME_OR_INTERVAL]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.TIME_POINT]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.TIME_INTERVAL]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };
    [Setting.WELLBORE_DEPTH_FILTER_TYPE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: { value: string; label: string }[] | null;
    };
    [Setting.PDM_FILTER_TYPE]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: { value: string; label: string }[] | null;
    };
    [Setting.WELLBORE_PICK_IDENTIFIER]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: string[];
    };

    // Single select complex object settings (SINGLE_SELECT category)
    [Setting.REPRESENTATION]: {
        internalValue: Representation | null;
        externalValue: Representation | null;
        valueRange: Representation[];
    };
    [Setting.PLOT_VARIANT]: {
        internalValue: TemplatePlotType | null;
        externalValue: TemplatePlotType | null;
        valueRange: TemplatePlotType[];
    };
    [Setting.LOG_CURVE]: {
        internalValue: WellboreLogCurveHeader_api | null;
        externalValue: WellboreLogCurveHeader_api | null;
        valueRange: WellboreLogCurveHeader_api[];
    };
    [Setting.ENSEMBLE]: {
        internalValue: RegularEnsembleIdent | null;
        externalValue: RegularEnsembleIdent | null;
        valueRange: RegularEnsembleIdent[];
    };
    [Setting.INTERSECTION]: {
        internalValue: IntersectionSettingValue | null;
        externalValue: IntersectionSettingValue | null;
        valueRange: IntersectionSettingValue[];
    };
    [Setting.SENSITIVITY]: {
        internalValue: SensitivityNameCasePair | null;
        externalValue: SensitivityNameCasePair | null;
        valueRange: SensitivityNameCasePair[];
    };
    [Setting.STATISTIC_FUNCTION]: {
        internalValue: SurfaceStatisticFunction_api;
        externalValue: SurfaceStatisticFunction_api;
        valueRange: SurfaceStatisticFunction_api[];
    };

    // Single select number settings (SINGLE_SELECT category)
    [Setting.REALIZATION]: {
        internalValue: number | null;
        externalValue: number | null;
        valueRange: number[];
    };

    // Multi select settings (MULTI_SELECT category)
    [Setting.REALIZATIONS]: {
        internalValue: number[] | null;
        externalValue: number[] | null;
        valueRange: number[];
    };
    [Setting.WELLBORES]: {
        internalValue: string[] | null;
        externalValue: WellboreHeader_api[] | null;
        valueRange: WellboreHeader_api[];
    };
    [Setting.SURFACE_NAMES]: {
        internalValue: string[] | null;
        externalValue: string[] | null;
        valueRange: string[];
    };
    [Setting.WELLBORE_PICKS]: {
        internalValue: string[] | null;
        externalValue: WellborePick_api[] | null;
        valueRange: WellborePick_api[];
    };

    // Time range selection settings (TIME_RANGE category) - valueRange is array of available time points
    [Setting.TIME_RANGE_WITH_POINTS]: {
        internalValue: { start: number; end: number } | null;
        externalValue: { start: number; end: number } | null;
        valueRange: number[];
    };

    // Static settings (STATIC category) - no valueRange
    [Setting.COLOR]: {
        internalValue: string | null;
        externalValue: string | null;
        valueRange: null;
    };
    [Setting.COLOR_SCALE]: {
        internalValue: ColorScaleSpecification | null;
        externalValue: ColorScaleSpecification | null;
        valueRange: null;
    };
    [Setting.DEPTH_COLOR_SCALE]: {
        internalValue: ColorScaleSpecification | null;
        externalValue: ColorScaleSpecification | null;
        valueRange: null;
    };
    [Setting.SEISMIC_COLOR_SCALE]: {
        internalValue: ColorScaleSpecification | null;
        externalValue: ColorScaleSpecification | null;
        valueRange: null;
    };
    [Setting.COLOR_SET]: {
        internalValue: ColorSet | null;
        externalValue: ColorSet | null;
        valueRange: null;
    };
    [Setting.POLYGON_VISUALIZATION]: {
        internalValue: PolygonVisualizationSpec | null;
        externalValue: PolygonVisualizationSpec | null;
        valueRange: null;
    };

    // Boolean + Number settings (BOOLEAN_NUMBER category)
    [Setting.CONTOURS]: {
        internalValue: { enabled: boolean; value: number } | null;
        externalValue: { enabled: boolean; value: number } | null;
        valueRange: [number, number] | null;
    };

    // XYZ range settings (XYZ_RANGE category) - demonstrates all three types being different
    [Setting.GRID_LAYER_RANGE]: {
        internalValue: {
            i: [number, number];
            j: [number, number];
            k: { type: "range"; range: [number, number] } | { type: "zone"; range: [number, number]; name: string };
        } | null;
        externalValue: [[number, number], [number, number], [number, number]] | null;
        valueRange: {
            range: { i: [number, number, number]; j: [number, number, number]; k: [number, number, number] };
            zones: Grid3dZone_api[];
        } | null;
    };

    // XYZ values with visibility (XYZ_VALUES_WITH_VISIBILITY category)
    [Setting.SEISMIC_SLICES]: {
        internalValue: {
            value: [number, number, number];
            visible: [boolean, boolean, boolean];
            applied: boolean;
        } | null;
        externalValue: {
            value: [number, number, number];
            visible: [boolean, boolean, boolean];
            applied: boolean;
        } | null;
        valueRange: [[number, number, number], [number, number, number], [number, number, number]];
    };

    [Setting.WELLBORE_DEPTH_FORMATION_FILTER]: {
        internalValue: {
            realizationNum: number;
            topSurfaceName: string | null;
            baseSurfaceName: string | null;
        } | null;
        externalValue: {
            realizationNum: number;
            topSurfaceName: string | null;
            baseSurfaceName: string | null;
        } | null;
        valueRange: {
            realizationNums: number[];
            surfaceNamesInStratOrder: string[];
        } | null;
    };

    [Setting.PDM_FILTER]: {
        internalValue: {
            production: {
                oil: {
                    value: number;
                    color: string;
                };
                gas: {
                    value: number;
                    color: string;
                };
                water: {
                    value: number;
                    color: string;
                };
            };
            injection: {
                water: {
                    value: number;
                    color: string;
                };
                gas: {
                    value: number;
                    color: string;
                };
            };
        } | null;
        externalValue: {
            production: {
                oil: {
                    value: number;
                    color: string;
                };
                gas: {
                    value: number;
                    color: string;
                };
                water: {
                    value: number;
                    color: string;
                };
            };
            injection: {
                water: {
                    value: number;
                    color: string;
                };
                gas: {
                    value: number;
                    color: string;
                };
            };
        } | null;
        valueRange: {
            production: {
                oil: number;
                gas: number;
                water: number;
            };
            injection: {
                water: number;
                gas: number;
            };
        } | null;
    };
};

export type Settings = ReadonlyArray<Setting> & { __brand?: "Settings" };
