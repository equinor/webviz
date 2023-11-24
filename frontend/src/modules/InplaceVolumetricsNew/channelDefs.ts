import { ChannelDefinition, DataType, Genre } from "@framework/DataChannelTypes";

export enum Channels {
    ResponseValuePerRealization = "Response value (per realization)",
}

export const channels: ChannelDefinition[] = [
    {
        ident: Channels.ResponseValuePerRealization,
        name: "Response value (per realization)",
        genre: Genre.Realization,
        dataType: DataType.Numeric,
    },
];
