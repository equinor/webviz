import type { InteractionSeries, MemberSeriesInteractionEntry } from "../../interaction";
import { makeInteractionLookupKey } from "../../interaction";
import type { MemberScatterTrace, SubplotGroup } from "../../types";

import { buildMemberScatterSeries } from "./series";

export function buildMemberScatterInteractionSeries(
    subplotGroups: SubplotGroup<MemberScatterTrace>[],
): InteractionSeries {
    const matchingSeriesIndicesByKey = new Map<string, number[]>();
    const seriesByAxisIndex = new Map<number, MemberSeriesInteractionEntry[]>();
    const nonEmptyGroups = subplotGroups.filter((group) => group.traces.length > 0);

    let nextSeriesIndex = 0;

    nonEmptyGroups.forEach(function buildAxisInteractionSeries(group, axisIndex) {
        const axisEntries: MemberSeriesInteractionEntry[] = [];

        for (const trace of group.traces) {
            const seriesResult = buildMemberScatterSeries(trace, axisIndex);
            const highlightGroupKey = trace.highlightGroupKey ?? trace.name;

            trace.memberIds.forEach(function appendMemberInteractionEntry(memberId, memberOffset) {
                const interactionKey = makeInteractionLookupKey(highlightGroupKey, String(memberId));
                const seriesIndex = nextSeriesIndex + memberOffset;
                const matchingSeriesIndices = matchingSeriesIndicesByKey.get(interactionKey) ?? [];

                matchingSeriesIndices.push(seriesIndex);
                matchingSeriesIndicesByKey.set(interactionKey, matchingSeriesIndices);

                axisEntries.push({
                    axisIndex,
                    color: trace.color,
                    groupKey: highlightGroupKey,
                    interactionKey,
                    kind: "member",
                    matchingSeriesIndices,
                    memberId: String(memberId),
                    seriesName: trace.name,
                    values: [trace.yValues[memberOffset]],
                    xValues: [trace.xValues[memberOffset]],
                });
            });

            nextSeriesIndex += seriesResult.series.length;
        }

        seriesByAxisIndex.set(axisIndex, axisEntries);
    });

    return { matchingSeriesIndicesByKey, resolutionMode: "scatter", seriesByAxisIndex };
}