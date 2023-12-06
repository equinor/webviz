import { KeyKind, ModuleChannelDefinition } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    TimeSeries = "TimeSeries (with value per realization)",
}

export const channelDefs: ModuleChannelDefinition[] = [
    {
        idString: BroadcastChannelNames.TimeSeries,
        displayName: "TimeSeries (with value per realization)",
        kindOfKey: KeyKind.Realization,
    },
];
