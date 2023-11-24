import { ChannelDefinition, DataType, Genre } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
}

export const channelDefs: ChannelDefinition[] = [
    {
        ident: BroadcastChannelNames.Response,
        name: "Response (per realization)",
        genre: Genre.Realization,
        dataType: DataType.Numeric,
    },
];
