import type { HoveredSeriesInfo, InteractionSeriesEntry } from "./types";

/** Maps an InteractionSeriesEntry to the consumer-facing HoveredSeriesInfo discriminated union. */
export function buildHoveredSeriesInfo(
    entry: InteractionSeriesEntry,
    dataIndex: number,
    timestampUtcMs: number | undefined,
): HoveredSeriesInfo {
    const baseInfo = {
        axisIndex: entry.axisIndex,
        color: entry.color,
        dataIndex,
        interactionKey: entry.interactionKey,
        seriesName: entry.seriesName,
        timestampUtcMs,
        value: entry.values[dataIndex],
    };

    if (entry.kind === "member") {
        return {
            ...baseInfo,
            kind: "member",
            groupKey: entry.groupKey,
            memberId: Number(entry.memberId),
        };
    }

    if (entry.kind === "statistic") {
        return {
            ...baseInfo,
            kind: "statistic",
            groupKey: entry.groupKey,
            statisticKey: entry.statisticKey,
            statisticLabel: entry.statisticLabel,
        };
    }

    return {
        ...baseInfo,
        ...(entry.kind === "reference-line"
            ? {
                kind: "reference-line" as const,
                groupKey: entry.groupKey,
            }
            : {
                kind: "point-annotation" as const,
                annotationComment: entry.annotationComment,
                annotationError: entry.annotationError,
                annotationLabel: entry.annotationLabel,
                groupKey: entry.groupKey,
            }),
    };
}
