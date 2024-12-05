/**
 * Utilities and constants used for generating well-log-viewer template configs
 */
import {
    Template,
    TemplatePlotTypes,
    TemplateTrack,
} from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import { v4 } from "uuid";

import { CURVE_COLOR_PALETTE, DIFF_CURVE_COLORS } from "./logViewerColors";
import { MAIN_AXIS_CURVE } from "./queryDataTransform";

import { TemplatePlotConfig } from "../types";

export const DEFAULT_MAX_VISIBLE_TRACKS = 5;

export function isCompositePlotType(type: TemplatePlotTypes) {
    return ["differential"].includes(type);
}

export function createLogTemplate(templateTrackConfigs: TemplateTrack[]): Template {
    return {
        // AFAIK, this name is not show anywhere
        name: "Well log viewer",
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
        _isValid: Boolean(plot.name && plot.type),
        _logAndName: plot._logAndName ?? `${plot.name}::{undefined}`,
        name: plot.name,
        type: plot.type,
        color: curveColor,
        color2: curveColor2,

        // Reset the values that are curve specific
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
            return config;
        default:
            throw new Error(`Unsupported plot type: ${plot.type}`);
    }
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
            return Boolean(config.colorTable);
        default:
            return true;
    }
}
