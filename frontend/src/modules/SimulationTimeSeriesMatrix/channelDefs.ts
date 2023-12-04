import { ChannelDefinition, Genre, Type } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    TimeSeries = "TimeSeries (with value per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        ident: BroadcastChannelNames.TimeSeries,
        name: "TimeSeries (with value per realization)",
        genre: Genre.Realization,
        dataType: Type.Number,
        metaData: {
            ensemble: Type.String,
            unit: Type.String,
        },
    },
];
