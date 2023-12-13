import { KeyKind, ModuleChannelDefinition } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    TimeSeries = "TimeSeries (with value per realization)",
    TimeSeries2 = "TimeSeries2 (with value per realization)",
    TimeSeries3 = "TimeSeries3 (with value per realization)",
}

export const channelDefs: ModuleChannelDefinition[] = [
    {
        idString: BroadcastChannelNames.TimeSeries,
        displayName: "TimeSeries (with value per realization)",
        kindOfKey: KeyKind.Realization,
    },
    {
        idString: BroadcastChannelNames.TimeSeries2,
        displayName: "TimeSeries2 (with value per realization)",
        kindOfKey: KeyKind.Realization,
    },
    {
        idString: BroadcastChannelNames.TimeSeries3,
        displayName: "TimeSeries3 (with value per realization)",
        kindOfKey: KeyKind.Realization,
    },
];
