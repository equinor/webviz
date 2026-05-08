import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export enum ChannelIds {
    METRIC_PER_REALIZATION = "relperm-metric-per-realization",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.METRIC_PER_REALIZATION,
        displayName: "RelPerm metric per realization",
        kindOfKey: KeyKind.REALIZATION,
    },
];
