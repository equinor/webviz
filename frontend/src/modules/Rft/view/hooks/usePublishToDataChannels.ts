import type { ViewContext } from "@framework/ModuleContext";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { ChannelContentDefinition } from "@framework/types/dataChannnel";
import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { ChannelIds } from "../../channelDefs";
import { makeRftDepthDataGenerator } from "../../dataGenerators";
import type { Interfaces } from "../../interfaces";
import type { RftRealizationCurve } from "../../typesAndEnums";

type PublishToDataChannelsParams = {
    entries: RftRealizationCurve[];
    responseName: string | null;
    dataChannelDepth: number | null;
    timestampUtcMs: number | null;
    makeEnsembleDisplayName: (ensembleIdent: RegularEnsembleIdent) => string;
    makeEnsembleColor: (ensembleIdent: RegularEnsembleIdent) => string;
    // Reactive values that `makeEnsembleDisplayName`/`makeEnsembleColor` close over (e.g. the selected
    // ensembles and the color set). They must participate in the publish dependency list, otherwise the
    // generated display names/colors can go stale when those inputs change without any of the other
    // dependencies changing.
    metaDependencies: unknown[];
    isFetching: boolean;
};

export function usePublishToDataChannels(
    viewContext: ViewContext<Interfaces>,
    {
        entries,
        responseName,
        dataChannelDepth,
        timestampUtcMs,
        makeEnsembleDisplayName,
        makeEnsembleColor,
        metaDependencies,
        isFetching,
    }: PublishToDataChannelsParams,
): void {
    const contents: ChannelContentDefinition[] = [];

    if (dataChannelDepth !== null && responseName) {
        const dateString = timestampUtcMs !== null ? timestampUtcMsToCompactIsoString(timestampUtcMs) : null;
        const groups = new Map<string, { ensembleIdent: RegularEnsembleIdent; entries: RftRealizationCurve[] }>();
        for (const entry of entries) {
            const key = entry.ensembleIdent.toString();
            const group = groups.get(key);
            if (group) {
                group.entries.push(entry);
            } else {
                groups.set(key, { ensembleIdent: entry.ensembleIdent, entries: [entry] });
            }
        }

        for (const [key, group] of groups) {
            const datePart = dateString ? ` @ ${dateString}` : "";
            const displayName = `${responseName}${datePart} @ ${dataChannelDepth.toFixed(1)} TVD (${makeEnsembleDisplayName(
                group.ensembleIdent,
            )})`;
            contents.push({
                contentIdString: key,
                displayName,
                dataGenerator: makeRftDepthDataGenerator(group.entries, dataChannelDepth, {
                    ensembleIdentString: group.ensembleIdent.toString(),
                    displayString: displayName,
                    preferredColor: makeEnsembleColor(group.ensembleIdent),
                }),
            });
        }
    }

    viewContext.usePublishChannelContents({
        channelIdString: ChannelIds.RESPONSE_AT_DEPTH,
        dependencies: [entries, responseName, dataChannelDepth, timestampUtcMs, ...metaDependencies],
        enabled: !isFetching && dataChannelDepth !== null && Boolean(responseName),
        contents,
    });
}
