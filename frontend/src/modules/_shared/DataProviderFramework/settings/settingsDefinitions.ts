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

export enum SettingCategory {
    SINGLE_SELECT = "singleSelect",
    MULTI_SELECT = "multiSelect",
    NUMBER = "number",
    NUMBER_WITH_STEP = "numberWithStep",
    // XYZ_NUMBER = "xyzNumber",
    XYZ_RANGE = "xyzRange",
    BOOLEAN = "boolean",
    BOOLEAN_NUMBER = "booleanNumber",
    STATIC = "static",
    XYZ_VALUES_WITH_VISIBILITY = "rangesWithVisibility",
}

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
    SMDA_WELLBORE_HEADERS = "smdaWellboreHeaders",
    STATISTIC_FUNCTION = "statisticFunction",
    SURFACE_NAME = "surfaceName",
    FORMATION_NAME = "formationName",
    SURFACE_NAMES = "surfaceNames",
    TIME_OR_INTERVAL = "timeOrInterval",
    TIME_POINT = "timePoint",
    TIME_INTERVAL = "timeInterval",
    WELLBORE_EXTENSION_LENGTH = "wellboreExtensionLength",
    WELLBORE_PICKS = "wellborePicks",
    WELLBORE_PICK_IDENTIFIER = "wellborePickIdentifier",
    REPRESENTATION = "representation",
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
    [Setting.SMDA_WELLBORE_HEADERS]: {
        internalValue: string[] | null;
        externalValue: string[] | null;
        valueRange: WellboreHeader_api[];
    };
    [Setting.SURFACE_NAMES]: {
        internalValue: string[] | null;
        externalValue: string[] | null;
        valueRange: string[];
    };
    [Setting.WELLBORE_PICKS]: {
        internalValue: string[] | null;
        externalValue: string[] | null;
        valueRange: WellborePick_api[];
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
        valueRange: [number, number];
    };

    // XYZ range settings (XYZ_RANGE category) - demonstrates all three types being different
    [Setting.GRID_LAYER_RANGE]: {
        internalValue: [
            [number, number],
            [number, number],
            { type: "range"; value: [number, number] } | { type: "zone"; value: string },
        ];
        externalValue: [[number, number], [number, number], [number, number]] | null;
        valueRange: {
            range: [[number, number], [number, number], [number, number]];
            zones: Grid3dZone_api[];
        };
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
        valueRange: [[number, number], [number, number], [number, number]];
    };
};

interface ValueRangeIntersectionReducer<TValueRange> {
    (accumulator: TValueRange, currentAvailableValues: TValueRange, currentIndex: number): TValueRange;
}

export type ValueRangeIntersectionReducerDefinition<TValueRange> = {
    reducer: ValueRangeIntersectionReducer<TValueRange>;
    startingValue: TValueRange;
    isValid: (availableValues: TValueRange) => boolean;
};

/* export type PossibleSettingsForCategory<TCategory extends SettingCategory> = {
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
    [SettingCategory.XYZ_VALUES_WITH_VISIBILITY]: <
        TSetting extends PossibleSettingsForCategory<SettingCategory.XYZ_VALUES_WITH_VISIBILITY>,
    >(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
        if (value === null) {
            return {
                value: [availableValues[0][0], availableValues[1][0], availableValues[2][0]],
                visible: [true, true, true],
                applied: false,
            };
        }

        const [xRange, yRange, zRange] = availableValues;

        const newValue: SettingTypes[TSetting] = {
            ...value,
            value: [
                Math.max(xRange[0], Math.min(xRange[1], value.value[0])),
                Math.max(yRange[0], Math.min(yRange[1], value.value[1])),
                Math.max(zRange[0], Math.min(zRange[1], value.value[2])),
            ],
        };
        return newValue;
    },
    [SettingCategory.BOOLEAN_NUMBER]: <TSetting extends PossibleSettingsForCategory<SettingCategory.BOOLEAN_NUMBER>>(
        value: SettingTypes[TSetting],
        availableValues: AvailableValuesType<TSetting>,
    ) => {
        if (value === null) {
            // Default: boolean false, number at min value or 0
            const defaultNumber = availableValues ? availableValues[0] : 0;
            return { enabled: false, value: defaultNumber } as SettingTypes[TSetting];
        }

        if (availableValues === null) {
            // If no available values, return value as-is
            return value;
        }

        const [min, max] = availableValues;

        // Clamp the number value to the available range
        const clampedNumber = Math.max(min, Math.min(max, value.value));

        return { enabled: value.enabled, value: clampedNumber } as SettingTypes[TSetting];
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
    [SettingCategory.XYZ_VALUES_WITH_VISIBILITY]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        const [xRange, yRange, zRange] = availableValues;
        return (
            value.value[0] >= xRange[0] &&
            value.value[0] <= xRange[1] &&
            value.value[1] >= yRange[0] &&
            value.value[1] <= yRange[1] &&
            value.value[2] >= zRange[0] &&
            value.value[2] <= zRange[1]
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
    [SettingCategory.BOOLEAN_NUMBER]: (value, availableValues) => {
        if (value === null) {
            return false;
        }
        if (availableValues === null) {
            // If no available values, just check type validity
            return typeof value.enabled === "boolean" && typeof value.value === "number";
        }
        const [min, max] = availableValues;
        return (
            typeof value.enabled === "boolean" &&
            typeof value.value === "number" &&
            value.value >= min &&
            value.value <= max
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
    }; */

// From: https://stackoverflow.com/a/50375286/62076
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

// If T is `any` a union of both side of the condition is returned.
type UnionForAny<T> = T extends never ? "A" : "B";

// Returns true if type is any, or false for any other type.
type IsStrictlyAny<T> = UnionToIntersection<UnionForAny<T>> extends never ? true : false;

export type MakeSettingTypesMap<
    T extends readonly (keyof SettingTypeDefinitions)[],
    AllowNull extends boolean = false,
> =
    IsStrictlyAny<T> extends true
        ? any
        : {
              [K in T[number]]: AllowNull extends false ? SettingTypeDefinitions[K] : SettingTypeDefinitions[K] | null;
          };

export type Settings = ReadonlyArray<Setting> & { __brand?: "MyType" };
