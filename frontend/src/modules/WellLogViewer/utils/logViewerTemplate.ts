import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { DropdownOption } from "@lib/components/Dropdown";
import {
    Template,
    TemplatePlotScaleTypes,
    TemplatePlotTypes,
    TemplateTrack,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import _ from "lodash";
import { v4 } from "uuid";

import { MAIN_AXIS_CURVE } from "./queryDataTransform";

import { TemplatePlotConfig, TemplateTrackConfig } from "../settings/atoms/persistedAtoms";

export const PLOT_SCALE_OPTIONS: (DropdownOption & { value: TemplatePlotScaleTypes })[] = [
    { label: "Linear", value: "linear" },
    { label: "Logaritmic", value: "log" },
];

type PlotDropdownOption = DropdownOption & { value: TemplatePlotTypes };

// Using the "Time series" palette to pick line colors
export const CURVE_COLOR_PALETTE = defaultColorPalettes[2] || defaultColorPalettes[0];
const DIFF_CURVE_COLORS = [
    // Colors based on the ones in the Time Series palette
    "#D62728",
    "#2CA02C",
];

export const DEFAULT_MAX_VISIBLE_TRACKS = 5;

const PLOT_TYPES = ["line", "linestep", "dot", "area", "gradientfill", "differential", "stacked"];
export const PLOT_TYPE_OPTIONS: PlotDropdownOption[] = [
    { value: "line", label: "Line" },
    { value: "linestep", label: "Linestep" },
    { value: "dot", label: "Dot" },
    { value: "area", label: "Area" },
    { value: "gradientfill", label: "Gradientfill" },
    // TODO: Type requires two named curves, ensure the flow for that is good
    { value: "differential", label: "Differential" },

    // This one is completely different; requires "discrete" metadata
    // { value: "stacked", label: "Stacked" },
];

export function isCompositePlotType(type: TemplatePlotTypes) {
    return ["differential"].includes(type);
}

export function createLogTemplate(templateTrackConfigs: TemplateTrack[]): Template {
    return {
        name: "Template test",
        scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        tracks: templateTrackConfigs,
    };
}

export function makeTrackPlot(plot: Partial<TemplatePlotConfig>): TemplatePlotConfig {
    // If colors get put as undefined, new colors are selected EVERY rerender, so we should avoid that
    const curveColor = plot.color ?? CURVE_COLOR_PALETTE.getColors()[0];
    const curveColor2 = plot.color2 ?? CURVE_COLOR_PALETTE.getColors()[3];
    // DIFF_CURVE_COLORS
    const config: TemplatePlotConfig = {
        ...plot,
        _id: plot._id ?? v4(),
        _isValid: Boolean(plot.name),
        name: plot.name,
        type: plot.type,
        color: curveColor,
        color2: curveColor2,

        //Reset the values that are curve specific
        name2: undefined,
        fill: undefined,
        fill2: undefined,
        colorTable: undefined,
    };

    switch (plot.type) {
        case "stacked":
            throw new Error("Stacked graph type currently not supported");
        case "differential":
            return {
                ...config,
                _isValid: config._isValid && Boolean(plot.name2),
                name2: plot.name2,
                fill: DIFF_CURVE_COLORS.at(0),
                fill2: DIFF_CURVE_COLORS.at(1),
            };

        case "gradientfill":
            return {
                ...config,
                colorTable: "Continuous",
            };

        case "line":
        case "linestep":
        case "dot":
        case "area":
        default:
            return config;
    }
}

function isValidPlot(config: Partial<TemplatePlotConfig>): boolean {
    // This is irregardless of plot type
    if (!config.type || !config.name || !config.color) return false;
    if (!Object.keys(PLOT_TYPES).includes(config.type)) return false;

    switch (config.type) {
        case "stacked":
            throw new Error("Stacked graph type currently not supported");
        case "differential":
            return Boolean(config.name2 && config.color2 && config.fill && config.fill2);
        case "gradientfill":
            return Boolean(config.colorTable);
        default:
            return true;
    }
}

export function transformToTrackConfigs(objs: any[]): TemplateTrackConfig[] {
    return objs.map(transformToTrackConfig);
}

function transformToTrackConfig(obj: any): TemplateTrackConfig {
    // ! Remember to keep this up to date if the config's structure changes
    const requiredFields = _.pick<TemplateTrackConfig>(obj, ["title", "plots"]);
    const optionalFields = _.pick<TemplateTrackConfig>(obj, ["_id", "required", "width", "scale", "domain"]);

    validateRequiredFields(requiredFields);

    return {
        ..._.omit(requiredFields),
        ..._.omit(optionalFields),
        _id: optionalFields._id ?? v4(),
        plots: requiredFields.plots.map(transformToPlotConfig),
    };
}

function transformToPlotConfig(obj: any): TemplatePlotConfig {
    const plotConfig = _.pick<TemplatePlotConfig>(obj, [
        "name",
        "style",
        "scale",
        "name2",
        "type",
        "scale",
        "domain",
        "color",
        "inverseColor",
        "fill",
        "fillOpacity",
        "colorTable",
        "inverseColorTable",
        "colorScale",
        "inverseColorScale",
        "color2",
        "fill2",
        "showLabels",
        "showLines",
        "labelRotation",
    ]) as TemplatePlotConfig;

    plotConfig._id = obj._id ?? v4();
    plotConfig._isValid = isValidPlot(plotConfig);

    return plotConfig;
}

function validateRequiredFields<T>(partialObj: Partial<T>): asserts partialObj is T {
    if (Object.values(partialObj).some((v) => v === undefined)) {
        throw new Error("Missing required fields");
    }
}
