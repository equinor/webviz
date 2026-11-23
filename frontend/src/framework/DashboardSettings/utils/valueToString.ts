import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

// Conversions from dashboard setting values to the strings shown when a setting is dashboard controlled.
// Add a function here for each new kind of dashboard setting value (e.g. interval, ensemble, realization).

export function timestampUtcMsToDashboardValueString(timestampUtcMs: number | null): string {
    return timestampUtcMs === null ? "-" : timestampUtcMsToCompactIsoString(timestampUtcMs);
}

export function realizationToDashboardValueString(realization: number | null): string {
    return realization === null ? "-" : realization.toString();
}
