import type { TemplatePlotType } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";
import { isEqual } from "lodash";

import type {
    SurfaceStatisticFunction_api,
    WellboreHeader_api,
    WellboreLogCurveHeader_api,
    WellborePick_api,
} from "@api";
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

    ATTRIBUTE = "attribute",
    ENSEMBLE = "ensemble",
    COLOR_SCALE = "colorScale",
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
    SURFACE_NAMES = "surfaceNames",
    TIME_OR_INTERVAL = "timeOrInterval",
    WELLBORE_EXTENSION_LENGTH = "wellboreExtensionLength",
    WELLBORE_PICKS = "wellborePicks",
}

export const settingCategories = {
    [Setting.SHOW_LABELS]: SettingCategory.BOOLEAN,
    [Setting.LABEL_ROTATION]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.SHOW_LINES]: SettingCategory.BOOLEAN,
    [Setting.TRACK_WIDTH]: SettingCategory.NUMBER,
    [Setting.SCALE]: SettingCategory.SINGLE_SELECT,
    [Setting.LOG_CURVE]: SettingCategory.SINGLE_SELECT,
    [Setting.PLOT_VARIANT]: SettingCategory.SINGLE_SELECT,
    [Setting.ATTRIBUTE]: SettingCategory.SINGLE_SELECT,
    [Setting.ENSEMBLE]: SettingCategory.SINGLE_SELECT,
    [Setting.COLOR_SCALE]: SettingCategory.STATIC,
    [Setting.COLOR_SET]: SettingCategory.STATIC,
    [Setting.COLOR]: SettingCategory.STATIC,
    [Setting.CONTOURS]: SettingCategory.BOOLEAN_NUMBER,
    [Setting.GRID_LAYER_RANGE]: SettingCategory.XYZ_RANGE,
    [Setting.GRID_LAYER_K]: SettingCategory.NUMBER,
    [Setting.GRID_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.INTERSECTION]: SettingCategory.SINGLE_SELECT,
    [Setting.OPACITY_PERCENT]: SettingCategory.NUMBER_WITH_STEP,
    [Setting.POLYGONS_ATTRIBUTE]: SettingCategory.SINGLE_SELECT,
    [Setting.POLYGONS_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.REALIZATION]: SettingCategory.SINGLE_SELECT,
    [Setting.REALIZATIONS]: SettingCategory.MULTI_SELECT,
    [Setting.SAMPLE_RESOLUTION_IN_METERS]: SettingCategory.NUMBER,
    [Setting.SEISMIC_SLICES]: SettingCategory.XYZ_VALUES_WITH_VISIBILITY,
    [Setting.SENSITIVITY]: SettingCategory.SINGLE_SELECT,
    [Setting.SHOW_GRID_LINES]: SettingCategory.BOOLEAN,
    [Setting.SMDA_INTERPRETER]: SettingCategory.SINGLE_SELECT,
    [Setting.SMDA_WELLBORE_HEADERS]: SettingCategory.MULTI_SELECT,
    [Setting.STATISTIC_FUNCTION]: SettingCategory.SINGLE_SELECT,
    [Setting.STRAT_COLUMN]: SettingCategory.SINGLE_SELECT,
    [Setting.SURFACE_NAME]: SettingCategory.SINGLE_SELECT,
    [Setting.SURFACE_NAMES]: SettingCategory.MULTI_SELECT,
    [Setting.TIME_OR_INTERVAL]: SettingCategory.SINGLE_SELECT,
    [Setting.WELLBORE_EXTENSION_LENGTH]: SettingCategory.NUMBER,
    [Setting.WELLBORE_PICKS]: SettingCategory.MULTI_SELECT,
} as const;

export type SettingCategories = typeof settingCategories;

export type SettingTypes = {
    [Setting.SHOW_LABELS]: boolean;
    [Setting.SCALE]: "linear" | "log" | null;
    [Setting.LABEL_ROTATION]: number | null;
    [Setting.SHOW_LINES]: boolean;
    [Setting.TRACK_WIDTH]: number | null;
    [Setting.LOG_CURVE]: WellboreLogCurveHeader_api | null;
    [Setting.PLOT_VARIANT]: TemplatePlotType | null;
    [Setting.ATTRIBUTE]: string | null;
    [Setting.ENSEMBLE]: RegularEnsembleIdent | null;
    [Setting.COLOR_SCALE]: ColorScaleSpecification | null;
    [Setting.COLOR_SET]: ColorSet | null;
    [Setting.COLOR]: string | null;
    [Setting.CONTOURS]: { enabled: boolean; value: number } | null;
    [Setting.GRID_LAYER_RANGE]: [[number, number], [number, number], [number, number]] | null;
    [Setting.GRID_LAYER_K]: number | null;
    [Setting.GRID_NAME]: string | null;
    [Setting.INTERSECTION]: IntersectionSettingValue | null;
    [Setting.OPACITY_PERCENT]: number | null;
    [Setting.POLYGONS_ATTRIBUTE]: string | null;
    [Setting.POLYGONS_NAME]: string | null;
    [Setting.REALIZATION]: number | null;
    [Setting.REALIZATIONS]: number[] | null;
    [Setting.SAMPLE_RESOLUTION_IN_METERS]: number | null;
    [Setting.SEISMIC_SLICES]: {
        value: [number, number, number];
        visible: [boolean, boolean, boolean];
        applied: boolean;
    } | null;
    [Setting.SENSITIVITY]: SensitivityNameCasePair | null;
    [Setting.SHOW_GRID_LINES]: boolean;
    [Setting.SMDA_INTERPRETER]: string | null;
    [Setting.SMDA_WELLBORE_HEADERS]: WellboreHeader_api[] | null;
    [Setting.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [Setting.STRAT_COLUMN]: string | null;
    [Setting.SURFACE_NAME]: string | null;
    [Setting.SURFACE_NAMES]: string[] | null;
    [Setting.TIME_OR_INTERVAL]: string | null;
    [Setting.WELLBORE_EXTENSION_LENGTH]: number | null;
    [Setting.WELLBORE_PICKS]: WellborePick_api[] | null;
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
