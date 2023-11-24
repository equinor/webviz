import { ChannelDefinition, DataType, Genre } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        ident: BroadcastChannelNames.Realization_Value,
        name: "Value (per realization)",
        genre: Genre.Realization,
        dataType: DataType.Numeric
    },
];
