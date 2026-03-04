import { useAtomValue } from "jotai";

import type { ViewContext } from "@framework/ModuleContext";
import type { ChannelContentDefinition, ChannelContentMetaData, DataGenerator } from "@framework/types/dataChannnel";

import { ChannelIds } from "../../channelDefs";
import type { Interfaces } from "../../interfaces";
import { formatDate } from "../atoms/derivedAtoms";
import type { ChartTrace, SubplotGroup } from "../atoms/derivedAtoms";

import { activeTimestampUtcMsAtom } from "./useActiveTimestamp";

/**
 * Build a lazy data generator for a single trace at a given timestamp.
 */
function makeDisplayString(vectorName: string, colorLabel: string, subplotTitle: string, dateLabel: string): string {
    const parts = [colorLabel];
    if (subplotTitle) {
        parts.push(subplotTitle);
    }
    parts.push(dateLabel);
    return `${vectorName} (${parts.join(", ")})`;
}

function makeTraceDataGenerator(
    trace: ChartTrace,
    activeTimestampUtcMs: number,
    vectorName: string,
    subplotTitle: string,
    dateLabel: string,
): DataGenerator {
    return () => {
        const data: { key: number; value: number }[] = [];

        if (trace.aggregatedValues) {
            const timestepIdx = trace.timestamps.indexOf(activeTimestampUtcMs);
            const idx = timestepIdx === -1 ? 0 : timestepIdx;

            for (let r = 0; r < trace.realizations.length; r++) {
                data.push({
                    key: trace.realizations[r],
                    value: trace.aggregatedValues[r][idx],
                });
            }
        }

        const metaData: ChannelContentMetaData = {
            unit: "",
            ensembleIdentString: trace.ensembleIdentString,
            displayString: makeDisplayString(vectorName, trace.label, subplotTitle, dateLabel),
            preferredColor: trace.color,
        };

        return { data, metaData };
    };
}

/**
 * Publishes data channel contents for each trace across all subplot groups.
 * The published values correspond to realization values at the currently
 * active (clicked) timestamp.
 */
export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    subplotGroups: SubplotGroup[],
    vectorName: string,
): void {
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const contents: ChannelContentDefinition[] = [];

    if (activeTimestampUtcMs != null) {
        const dateLabel = formatDate(activeTimestampUtcMs);

        for (const group of subplotGroups) {
            for (const trace of group.traces) {
                if (!trace.aggregatedValues) continue;

                const contentId = group.title ? `${group.title}-${trace.label}` : trace.label;

                contents.push({
                    contentIdString: contentId,
                    displayName: makeDisplayString(vectorName, trace.label, group.title, dateLabel),
                    dataGenerator: makeTraceDataGenerator(
                        trace,
                        activeTimestampUtcMs,
                        vectorName,
                        group.title,
                        dateLabel,
                    ),
                });
            }
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_PER_REAL,
        dependencies: [subplotGroups, activeTimestampUtcMs],
        enabled: activeTimestampUtcMs != null && subplotGroups.length > 0,
        contents,
    });
}
