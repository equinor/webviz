/**
 * Utilities and constants used for generating well-log-viewer template configs
 */
import { WellLogCurveTypeEnum_api } from "@api";
import { Template, TemplatePlot, TemplateTrack } from "@webviz/well-log-viewer/dist/components/WellLogTemplateTypes";

import _ from "lodash";
import { v4 } from "uuid";

import { CURVE_COLOR_PALETTE, DIFF_CURVE_COLORS } from "./logViewerColors";
import { MAIN_AXIS_CURVE } from "./queryDataTransform";
import { getUniqueCurveNameForPlotConfig } from "./strings";

import { TemplatePlotConfig, TemplateTrackConfig } from "../types";

export const DEFAULT_MAX_VISIBLE_TRACKS = 5;

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

export function makeTrackPlot(plot: Partial<TemplatePlotConfig>): TemplatePlotConfig {
    // const curveColor = plot.color ?? ;
    // const curveColor2 = plot.color2 ?? ;
    // DIFF_CURVE_COLORS

    const config: TemplatePlotConfig = _.defaults(plot, {
        _curveHeader: null,
        _key: v4(),
        // If "color" is undefined, new colors are selected EVERY rerender, so we should avoid that
        color: CURVE_COLOR_PALETTE.getColors()[0],
        color2: CURVE_COLOR_PALETTE.getColors()[3],
    } as TemplatePlotConfig);

    // Recompute derived values
    config._isValid = Boolean(plot._curveHeader && plot.type);
    config.name = config._curveHeader?.curveName;

    // Reset config options that are only used in some specific cases
    // config.color2 = undefined;
    config.name2 = undefined;
    config.fill = undefined;
    config.fill2 = undefined;
    config.colorMapFunctionName = undefined;

    switch (plot.type) {
        case "differential":
            config._isValid = config._isValid && Boolean(plot._curveHeader2);
            config.name2 = plot._curveHeader2?.curveName;
            // config.color2 = plot.;
            config.fill = DIFF_CURVE_COLORS.at(0);
            config.fill2 = DIFF_CURVE_COLORS.at(1);
            break;
        case "gradientfill":
            config.colorMapFunctionName = "Continuous";
            break;
        case "stacked":
            if (config._curveHeader?.curveType === WellLogCurveTypeEnum_api.CONTINUOUS) {
                console.warn(
                    `Showing continuous curve ${config._curveHeader.curveName} as a stacked plot. This is most likely a mistake`
                );
            }
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
