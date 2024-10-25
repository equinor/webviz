import { WellLogCurveSourceEnum_api, WellboreLogCurveData_api } from "@api";
import { TemplatePlotConfig } from "@modules/WellLogViewer/types";

/**
 * Translates a well log curve data source to a more readable string
 * @param source A valid well log curve source (ssdl:well_log, etc.)
 * @returns A simple readable name for the source
 */
export function curveSourceToText(source: WellLogCurveSourceEnum_api) {
    switch (source) {
        case WellLogCurveSourceEnum_api.SMDA_GEOLOGY:
            return "Geology";
        case WellLogCurveSourceEnum_api.SMDA_STRATIGRAPHY:
            return "Stratigraphy";
        case WellLogCurveSourceEnum_api.SSDL_WELL_LOG:
            return "Well-log";
    }
}

/**
 * Simplifies some well log names to make them more suited for showing in the UI.
 */
export function simplifyLogName(logName: string, truncateLength = 0) {
    // Removes curve-name, in case the log name is from a computed source (strat or geo)
    logName = logName.split("::")[0];

    // ! Unsure what sources there are, but this one seems to show up a lot for geology headers
    if (logName === "OpenWorks R5000") return "OpenWorks";
    // Fallback to ellipse for other long names
    // TODO: Generalized shortening that doesn't truncate unless absolutely neccessary?
    else if (truncateLength && logName.length > truncateLength) return logName.substring(0, truncateLength - 1) + "…";
    // Fallback to name in all other cases
    else return logName;
}

export function getUniqueCurveNameForPlotConfig(plot: TemplatePlotConfig, nonUniqueNames?: Set<string>) {
    if (!plot.name) throw new Error("Unexpected invalid config");
    if (!plot._curveHeader) throw new Error("Unexpected invalid config");

    if (nonUniqueNames?.has(plot.name)) {
        return makeCompoundCurveName(plot._curveHeader.curveName, plot._curveHeader.logName);
    } else {
        return plot.name;
    }
}

export function getUniqueCurveNameForCurveData(curve: WellboreLogCurveData_api, nonUniqueNames?: Set<string>) {
    if (nonUniqueNames?.has(curve.name)) {
        return makeCompoundCurveName(curve.name, curve.logName);
    } else {
        return curve.name;
    }
}

function makeCompoundCurveName(curveName: string, logName: string) {
    return `${curveName} - ${simplifyLogName(logName)}`;
}
