import { ChannelDefinition, KeyKind } from "@framework/DataChannelTypes";

export enum ChannelIds {
    REALIZATION_VALUE = "Value (per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        idString: ChannelIds.REALIZATION_VALUE,
        displayName: "Value (per realization)",
        kindOfKey: KeyKind.REALIZATION,
    },
];
