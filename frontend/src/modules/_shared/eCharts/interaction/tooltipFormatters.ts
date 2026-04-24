import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";
import { formatNumber } from "@modules/_shared/utils/numberFormatting";

import { formatCompactTooltip } from "../core/tooltip";

import type { HoveredSeriesInfo, InteractionSeriesEntry } from "./types";

/**
 * Formats tooltip HTML content for timeseries interaction hits.
 *
 * Handles member, statistic, reference-line, and point-annotation entry kinds.
 * Point annotations include error bars and optional comments; all other kinds
 * share the same single-row pattern (label + value + color swatch).
 */
export function formatTimeseriesInteractionTooltip(
    entry: InteractionSeriesEntry,
    hoveredSeriesInfo: HoveredSeriesInfo,
    timestampUtcMs: number,
    dataIndex: number,
    formatSeriesLabel?: (info: HoveredSeriesInfo) => string,
): string {
    const header = timestampUtcMsToCompactIsoString(timestampUtcMs);
    const label = resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel);

    if (entry.kind === "point-annotation") {
        return formatCompactTooltip(header, [
            {
                label,
                value: `${formatNumber(entry.values[dataIndex])} \u00B1 ${formatNumber(entry.annotationError)}`,
                color: entry.color,
            },
            ...(entry.annotationComment ? [{ label: "Comment", value: entry.annotationComment }] : []),
        ]);
    }

    return formatCompactTooltip(header, [
        {
            label,
            value: formatNumber(entry.values[dataIndex]),
            color: entry.color,
        },
    ]);
}

/** Formats tooltip HTML content for scatter interaction hits. */
export function formatScatterInteractionTooltip(
    entry: InteractionSeriesEntry,
    hoveredSeriesInfo: HoveredSeriesInfo,
    formatSeriesLabel?: (info: HoveredSeriesInfo) => string,
): string {
    return formatCompactTooltip(entry.seriesName, [
        { label: "X", value: formatNumber(entry.xValues[0]) },
        { label: "Y", value: formatNumber(entry.values[0]) },
        {
            label: resolveSeriesLabel(hoveredSeriesInfo, formatSeriesLabel),
            value: "",
            color: entry.color,
        },
    ]);
}

/** Resolves series label using custom formatter or a built-in default. */
export function resolveSeriesLabel(
    hoveredSeriesInfo: HoveredSeriesInfo,
    formatSeriesLabel?: (info: HoveredSeriesInfo) => string,
): string {
    return formatSeriesLabel?.(hoveredSeriesInfo) ?? formatDefaultSeriesLabel(hoveredSeriesInfo);
}

function formatDefaultSeriesLabel(hoveredSeriesInfo: HoveredSeriesInfo): string {
    switch (hoveredSeriesInfo.kind) {
        case "member":
            return `Member ${hoveredSeriesInfo.memberId}`;
        case "statistic":
            return `${hoveredSeriesInfo.seriesName ?? "Series"} ${hoveredSeriesInfo.statisticLabel}`;
        case "reference-line":
            return hoveredSeriesInfo.seriesName ?? "Reference line";
        case "point-annotation":
            return `${hoveredSeriesInfo.seriesName ?? "Point annotation"}: ${hoveredSeriesInfo.annotationLabel}`;
    }
}
