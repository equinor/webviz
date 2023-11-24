import { ChannelDefinition, DataType, Genre } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    TimeSeries = "TimeSeries (with value per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        ident: BroadcastChannelNames.TimeSeries,
        name: "TimeSeries (with value per realization)",
        genre: Genre.Realization,
        dataType: DataType.Numeric,
        metaData: {
            ensemble: DataType.String,
            unit: DataType.String,
        },
    },
];
