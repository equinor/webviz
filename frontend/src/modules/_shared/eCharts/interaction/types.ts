import type { StatisticKey } from "../types";

type HoveredSeriesInfoBase = {
    axisIndex?: number;
    color?: string;
    dataIndex?: number;
    interactionKey: string;
    seriesName?: string;
    timestampUtcMs?: number;
    value?: number;
};

export type HoveredSeriesInfo =
    | (HoveredSeriesInfoBase & {
        kind: "member";
        groupKey: string;
        memberId: number;
    })
    | (HoveredSeriesInfoBase & {
        kind: "point-annotation";
        annotationComment?: string;
        annotationError: number;
        annotationLabel: string;
        groupKey: string;
    })
    | (HoveredSeriesInfoBase & {
        kind: "reference-line";
        groupKey: string;
    })
    | (HoveredSeriesInfoBase & {
        kind: "statistic";
        groupKey: string;
        statisticKey: StatisticKey;
        statisticLabel: string;
    });

type InteractionSeriesEntryBase = {
    axisIndex: number;
    color?: string;
    groupKey: string;
    interactionKey: string;
    matchingSeriesIndices: number[];
    seriesName: string;
    values: number[];
    xValues: number[];
};

export type MemberSeriesInteractionEntry = InteractionSeriesEntryBase & {
    kind: "member";
    memberId: string;
};

export type StatisticInteractionSeriesEntry = InteractionSeriesEntryBase & {
    kind: "statistic";
    statisticKey: StatisticKey;
    statisticLabel: string;
};

export type ReferenceLineInteractionSeriesEntry = InteractionSeriesEntryBase & {
    kind: "reference-line";
};

export type PointAnnotationInteractionSeriesEntry = InteractionSeriesEntryBase & {
    kind: "point-annotation";
    annotationComment?: string;
    annotationError: number;
    annotationLabel: string;
};

export type InteractionSeriesEntry =
    | MemberSeriesInteractionEntry
    | StatisticInteractionSeriesEntry
    | ReferenceLineInteractionSeriesEntry
    | PointAnnotationInteractionSeriesEntry;

export type InteractionSeries = {
    matchingSeriesIndicesByKey: Map<string, number[]>;
    resolutionMode: "scatter" | "timeseries";
    seriesByAxisIndex: Map<number, InteractionSeriesEntry[]>;
};

export function makeInteractionLookupKey(groupKey: string, entryKey: string): string {
    return `${groupKey}:${entryKey}`;
}