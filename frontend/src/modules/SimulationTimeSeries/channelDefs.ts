import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export enum ChannelIds {
    TIME_SERIES = "TimeSeries (with value per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.TIME_SERIES,
        displayName: "Time series (with value per realization)",
        kindOfKey: KeyKind.REALIZATION,
    },
];
