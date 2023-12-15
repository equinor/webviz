import { KeyKind, ModuleChannelDefinition } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const channelDefs: ModuleChannelDefinition[] = [
    {
        idString: BroadcastChannelNames.Realization_Value,
        displayName: "Value (per realization)",
        kindOfKey: KeyKind.Realization,
    },
];
