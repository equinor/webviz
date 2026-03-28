import type { InteractionSeries, InteractionSeriesEntry } from "../../interaction";
import type { SubplotGroup, TimeseriesDisplayConfig, TimeseriesSubplotOverlays, TimeseriesTrace } from "../../types";

import { buildTimeseriesSubplotArtifacts } from "./subplotArtifacts";

type TimeseriesInteractionSeriesOptions = {
    displayConfig: TimeseriesDisplayConfig;
    subplotOverlays: TimeseriesSubplotOverlays[];
};

export function buildTimeseriesInteractionSeries(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    options: TimeseriesInteractionSeriesOptions,
): InteractionSeries {
    // Reuse the same ordered subplot artifacts as the visual builder and only translate
    // relative subplot-local indices into absolute ECharts series indices here.
    const { displayConfig, subplotOverlays } = options;
    const matchingSeriesIndicesByKey = new Map<string, number[]>();
    const seriesByAxisIndex = new Map<number, InteractionSeriesEntry[]>();
    const nonEmptyGroupedData = subplotGroups
        .map((group, index) => ({ group, overlays: subplotOverlays[index] }))
        .filter((entry) => entry.group.traces.length > 0);

    let nextSeriesIndex = 0;

    nonEmptyGroupedData.forEach(function buildAxisInteractionSeries(entry, axisIndex) {
        const subplotArtifacts = buildTimeseriesSubplotArtifacts(entry.group, entry.overlays, axisIndex, displayConfig);
        const axisEntries: InteractionSeriesEntry[] = [];

        subplotArtifacts.interactionEntries.forEach(function appendAxisInteractionEntry(draftEntry) {
            const matchingSeriesIndices = matchingSeriesIndicesByKey.get(draftEntry.entry.interactionKey) ?? [];
            const absoluteSeriesIndices = draftEntry.relativeSeriesIndices.map((seriesIndex) => nextSeriesIndex + seriesIndex);

            matchingSeriesIndices.push(...absoluteSeriesIndices);
            matchingSeriesIndicesByKey.set(draftEntry.entry.interactionKey, matchingSeriesIndices);

            const interactionEntry: InteractionSeriesEntry = {
                ...draftEntry.entry,
                matchingSeriesIndices,
            };

            axisEntries.push(interactionEntry);
        });

        nextSeriesIndex += subplotArtifacts.series.length;
        seriesByAxisIndex.set(axisIndex, axisEntries);
    });

    return { matchingSeriesIndicesByKey, resolutionMode: "timeseries", seriesByAxisIndex };
}