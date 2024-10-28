/**
 * Utilities and constants used for generating well-log-viewer template configs
 */
import { WellLogCurveTypeEnum_api } from "@api";
import { OptionalExceptFor } from "@lib/utils/typing";
import {
    Template,
    TemplatePlot,
    TemplatePlotType,
    TemplateTrack,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { v4 } from "uuid";

import { CURVE_COLOR_PALETTE, DIFF_CURVE_COLORS } from "./logViewerColors";
import { MAIN_AXIS_CURVE } from "./queryDataTransform";
import { getUniqueCurveNameForPlotConfig } from "./strings";

import { TemplatePlotConfig, TemplateTrackConfig } from "../types";

export const DEFAULT_MAX_VISIBLE_TRACKS = 5;

export function isCompositePlotType(type: TemplatePlotType) {
    return ["differential"].includes(type);
}
export function plotIsDiscrete(plotConfig: TemplatePlotConfig): boolean {
    const { _curveHeader } = plotConfig;

    // TODO: Can we assume that some specific well-log curves are discrete based on name? For instance, STAT_WI has log named ZONE, which gives string values.

    return _curveHeader?.curveType === WellLogCurveTypeEnum_api.DISCRETE;
}

export function createLogTemplate(templateTracks: TemplateTrackConfig[], nonUniqueNames?: Set<string>): Template {
    return {
        // AFAIK, this name is not show anywhere
        name: "Well log viewer",
        scale: { primary: MAIN_AXIS_CURVE.name, allowSecondary: true },
        tracks: templateTracks.map<TemplateTrack>((track) => ({
            ...track,
            plots: track.plots.map((plot) => ({
                ...plot,
                name: getUniqueCurveNameForPlotConfig(plot, nonUniqueNames),
            })) as TemplatePlot[],
        })),
    };
}

export function makeTrackPlot(plot: OptionalExceptFor<TemplatePlotConfig, "_curveHeader">): TemplatePlotConfig {
    // If colors get put as undefined, new colors are selected EVERY rerender, so we should avoid that
    const curveColor = plot.color ?? CURVE_COLOR_PALETTE.getColors()[0];
    const curveColor2 = plot.color2 ?? CURVE_COLOR_PALETTE.getColors()[3];
    // DIFF_CURVE_COLORS
    const config: TemplatePlotConfig = {
        ...plot,
        _key: plot._key ?? v4(),
        _isValid: Boolean(plot.name && plot.type),
        name: plot.name,
        type: plot.type,
        color: curveColor,
        color2: curveColor2,

        // Reset the values that are curve specific
        name2: undefined,
        fill: undefined,
        fill2: undefined,
        colorMapFunctionName: undefined,
    };

    switch (plot.type) {
        case "stacked":
            config.color = undefined;
            config.color2 = undefined;
            break;
        case "differential":
            config._isValid = config._isValid && Boolean(plot.name2);
            config.name2 = plot.name2;
            config.fill = DIFF_CURVE_COLORS.at(0);
            config.fill2 = DIFF_CURVE_COLORS.at(1);
            break;
        case "gradientfill":
            config.colorMapFunctionName = "Continuous";
            break;
        case "line":
        case "linestep":
        case "dot":
        case "area":
            break;
        default:
            throw new Error(`Unsupported plot type: ${plot.type}`);
    }

    return config;
}

// Matches the ones from the TemplatePlotTypes literal
const AVAILABLE_PLOT_TYPES = ["line", "linestep", "dot", "area", "gradientfill", "differential", "stacked"];

export function isValidPlot(config: Partial<TemplatePlotConfig>): boolean {
    // This is irregardless of plot type
    if (!config.type || !config.name || !config.color) return false;
    if (!AVAILABLE_PLOT_TYPES.includes(config.type)) return false;

    switch (config.type) {
        case "stacked":
            throw new Error("Stacked graph type currently not supported");
        case "differential":
            return Boolean(config.name2 && config.color2 && config.fill && config.fill2);
        case "gradientfill":
            return Boolean(config.colorMapFunctionName);
        default:
            return true;
    }
}
