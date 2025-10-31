import type { ChannelDefinition } from "@framework/types/dataChannnel";
import { KeyKind } from "@framework/types/dataChannnel";

export enum ChannelIds {
    RESPONSE_PER_REAL = "response-per-real",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.RESPONSE_PER_REAL,
        displayName: "Volume Response per realization",
        kindOfKey: KeyKind.REALIZATION,
    },
];
