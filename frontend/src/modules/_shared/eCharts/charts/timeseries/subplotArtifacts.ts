import type { CartesianChartSeries } from "../../core/cartesianSubplotChart";
import type { SeriesBuildResult } from "../../core/composeChartOption";
import type {
    MemberSeriesInteractionEntry,
    PointAnnotationInteractionSeriesEntry,
    ReferenceLineInteractionSeriesEntry,
    StatisticInteractionSeriesEntry,
} from "../../interaction";
import { makeInteractionLookupKey } from "../../interaction";
import type { SubplotGroup, TimeseriesDisplayConfig, TimeseriesSubplotOverlays, TimeseriesTrace } from "../../types";

import { buildMemberSeries } from "./memberSeries";
import { buildPointAnnotationSeries } from "./pointAnnotationSeries";
import { buildReferenceLineSeries } from "./referenceLineSeries";
import { buildFanchartSeries, buildStatisticsSeries, formatStatisticLabel, getOrderedStatisticKeys } from "./statisticsSeries";

type InteractionSeriesEntryWithoutMatches =
    | Omit<MemberSeriesInteractionEntry, "matchingSeriesIndices">
    | Omit<StatisticInteractionSeriesEntry, "matchingSeriesIndices">
    | Omit<ReferenceLineInteractionSeriesEntry, "matchingSeriesIndices">
    | Omit<PointAnnotationInteractionSeriesEntry, "matchingSeriesIndices">;

type InteractionSeriesEntryDraft = {
    entry: InteractionSeriesEntryWithoutMatches;
    relativeSeriesIndices: number[];
};

export type TimeseriesSubplotArtifacts = {
    axisTimestamps: number[];
    interactionEntries: InteractionSeriesEntryDraft[];
    legendData: string[];
    series: CartesianChartSeries[];
};

/**
 * Builds the ordered subplot payload for the timeseries family.
 *
 * This is the single place that decides which series a subplot emits and in what order.
 * It returns both the visual ECharts series and draft interaction entries keyed to relative
 * series indices within that same subplot so the chart builder and interaction builder stay aligned.
 */
export function buildTimeseriesSubplotArtifacts(
    group: SubplotGroup<TimeseriesTrace>,
    subplotOverlays: TimeseriesSubplotOverlays,
    axisIndex: number,
    config: TimeseriesDisplayConfig,
): TimeseriesSubplotArtifacts {
    const series: CartesianChartSeries[] = [];
    const legendData: string[] = [];
    const seenLegend = new Set<string>();
    const interactionEntries: InteractionSeriesEntryDraft[] = [];
    const axisTimestamps = group.traces.find((trace) => trace.timestamps.length > 0)?.timestamps ?? [];

    let nextRelativeSeriesIndex = 0;

    for (const trace of group.traces) {
        if (config.showRealizations && trace.realizationValues) {
            const memberResult = buildMemberSeries(trace, axisIndex);
            appendSeriesBuildResult(series, legendData, seenLegend, memberResult);
            appendMemberInteractionEntries(interactionEntries, trace, axisIndex, nextRelativeSeriesIndex);
            nextRelativeSeriesIndex += memberResult.series.length;
        }

        if (config.showStatistics && trace.statistics) {
            const statisticsResult = buildStatisticsSeries(trace, config.selectedStatistics, axisIndex);
            appendSeriesBuildResult(series, legendData, seenLegend, statisticsResult);
            appendStatisticInteractionEntries(
                interactionEntries,
                trace,
                axisIndex,
                nextRelativeSeriesIndex,
                config.selectedStatistics,
            );
            nextRelativeSeriesIndex += statisticsResult.series.length;
        }

        if (config.showFanchart && trace.statistics) {
            const fanchartResult = buildFanchartSeries(trace, config.selectedStatistics, axisIndex);
            appendSeriesBuildResult(series, legendData, seenLegend, fanchartResult);
            nextRelativeSeriesIndex += fanchartResult.series.length;
        }
    }

    if (config.showReferenceLines) {
        for (const referenceLineTrace of subplotOverlays.referenceLineTraces) {
            const referenceLineResult = buildReferenceLineSeries(referenceLineTrace, axisIndex);
            appendSeriesBuildResult(series, legendData, seenLegend, referenceLineResult);
            appendReferenceLineInteractionEntry(
                interactionEntries,
                referenceLineTrace,
                axisIndex,
                nextRelativeSeriesIndex,
                axisTimestamps,
            );
            nextRelativeSeriesIndex += referenceLineResult.series.length;
        }
    }

    if (config.showPointAnnotations) {
        for (const pointAnnotationTrace of subplotOverlays.pointAnnotationTraces) {
            const pointAnnotationResult = buildPointAnnotationSeries(pointAnnotationTrace, axisIndex);
            appendSeriesBuildResult(series, legendData, seenLegend, pointAnnotationResult);
            appendPointAnnotationInteractionEntries(
                interactionEntries,
                pointAnnotationTrace,
                axisIndex,
                nextRelativeSeriesIndex,
                axisTimestamps,
            );
            nextRelativeSeriesIndex += pointAnnotationResult.series.length;
        }
    }

    return {
        axisTimestamps,
        interactionEntries,
        legendData,
        series,
    };
}

function appendSeriesBuildResult(
    targetSeries: CartesianChartSeries[],
    legendData: string[],
    seenLegend: Set<string>,
    result: SeriesBuildResult,
): void {
    targetSeries.push(...result.series);
    addLegendEntries(legendData, seenLegend, result.legendData);
}

function appendMemberInteractionEntries(
    interactionEntries: InteractionSeriesEntryDraft[],
    trace: TimeseriesTrace,
    axisIndex: number,
    nextRelativeSeriesIndex: number,
): void {
    const interactionGroupKey = trace.highlightGroupKey ?? trace.name;

    trace.realizationValues?.forEach(function appendMemberInteractionEntry(realizationValues, memberOffset) {
        const memberId = String(trace.realizationIds?.[memberOffset] ?? memberOffset);

        interactionEntries.push({
            entry: {
                axisIndex,
                color: trace.color,
                groupKey: interactionGroupKey,
                interactionKey: makeInteractionLookupKey(interactionGroupKey, memberId),
                kind: "member",
                memberId,
                seriesName: trace.name,
                values: realizationValues,
                xValues: trace.timestamps,
            },
            relativeSeriesIndices: [nextRelativeSeriesIndex + memberOffset],
        });
    });
}

function appendStatisticInteractionEntries(
    interactionEntries: InteractionSeriesEntryDraft[],
    trace: TimeseriesTrace,
    axisIndex: number,
    nextRelativeSeriesIndex: number,
    selectedStatistics: TimeseriesDisplayConfig["selectedStatistics"],
): void {
    const interactionGroupKey = trace.highlightGroupKey ?? trace.name;
    const orderedStatisticKeys = getOrderedStatisticKeys(selectedStatistics);

    orderedStatisticKeys.forEach(function appendStatisticInteractionEntry(statisticKey, statisticOffset) {
        interactionEntries.push({
            entry: {
                axisIndex,
                color: trace.color,
                groupKey: interactionGroupKey,
                interactionKey: makeInteractionLookupKey(interactionGroupKey, `stat:${statisticKey}`),
                kind: "statistic",
                seriesName: trace.name,
                statisticKey,
                statisticLabel: formatStatisticLabel(statisticKey),
                values: trace.statistics?.[statisticKey] ?? [],
                xValues: trace.timestamps,
            },
            relativeSeriesIndices: [nextRelativeSeriesIndex + statisticOffset],
        });
    });
}

function appendReferenceLineInteractionEntry(
    interactionEntries: InteractionSeriesEntryDraft[],
    trace: TimeseriesSubplotOverlays["referenceLineTraces"][number],
    axisIndex: number,
    nextRelativeSeriesIndex: number,
    axisTimestamps: number[],
): void {
    interactionEntries.push({
        entry: {
            axisIndex,
            color: trace.color,
            groupKey: trace.name,
            interactionKey: makeInteractionLookupKey(trace.name, "reference-line"),
            kind: "reference-line",
            seriesName: trace.name,
            values: buildAlignedTimeseriesValues(axisTimestamps, trace.timestamps, trace.values),
            xValues: axisTimestamps,
        },
        relativeSeriesIndices: [nextRelativeSeriesIndex],
    });
}

function appendPointAnnotationInteractionEntries(
    interactionEntries: InteractionSeriesEntryDraft[],
    trace: TimeseriesSubplotOverlays["pointAnnotationTraces"][number],
    axisIndex: number,
    nextRelativeSeriesIndex: number,
    axisTimestamps: number[],
): void {
    trace.annotations.forEach(function appendPointAnnotationInteractionEntry(annotation, annotationIndex) {
        interactionEntries.push({
            entry: {
                annotationComment: annotation.comment,
                annotationError: Math.abs(annotation.error),
                annotationLabel: annotation.label,
                axisIndex,
                color: trace.color,
                groupKey: trace.name,
                interactionKey: makeInteractionLookupKey(trace.name, `annotation:${annotationIndex}`),
                kind: "point-annotation",
                seriesName: trace.name,
                values: buildAlignedTimeseriesValues(axisTimestamps, [annotation.date], [annotation.value]),
                xValues: axisTimestamps,
            },
            relativeSeriesIndices: [nextRelativeSeriesIndex + annotationIndex],
        });
    });
}

function buildAlignedTimeseriesValues(axisTimestamps: number[], sourceTimestamps: number[], sourceValues: number[]): number[] {
    const valuesByTimestamp = new Map<number, number>();

    sourceTimestamps.forEach(function indexSourceTimestamp(timestamp, index) {
        const value = sourceValues[index];
        if (Number.isFinite(value)) {
            valuesByTimestamp.set(timestamp, value);
        }
    });

    return axisTimestamps.map((timestamp) => valuesByTimestamp.get(timestamp) ?? Number.NaN);
}

function addLegendEntries(legendData: string[], seenLegend: Set<string>, entries: string[]): void {
    for (const entry of entries) {
        if (entry && !seenLegend.has(entry)) {
            legendData.push(entry);
            seenLegend.add(entry);
        }
    }
}