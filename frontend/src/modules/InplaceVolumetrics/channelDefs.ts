import { ChannelDefinition, KeyKind } from "@framework/DataChannelTypes";

export enum ChannelIds {
    RESPONSE = "Response (per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.RESPONSE,
        displayName: "Response (per realization)",
        kindOfKey: KeyKind.REALIZATION,
    },
];
