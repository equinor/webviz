import { ChannelDefinition, KeyKind } from "@framework/DataChannelTypes";

export enum ChannelIds {
    RESPONSE_PER_REAL = "response-per-real",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.RESPONSE_PER_REAL,
        displayName: "Volumetric Response per realization",
        kindOfKey: KeyKind.REALIZATION,
    },
];
