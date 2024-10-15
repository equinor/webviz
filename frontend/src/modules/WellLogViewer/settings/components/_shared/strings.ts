import { WellLogCurveSourceEnum_api } from "@api";

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