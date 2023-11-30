import { ChannelDefinition, DataType, Genre } from "@framework/DataChannelTypes";

export enum Channels {
    GridIJK = "Grid IJK",
}

export const channels: ChannelDefinition[] = [
    {
        ident: Channels.GridIJK,
        name: "Grid IJK",
        genre: Genre.GridIJK,
        dataType: DataType.Numeric,
    },
];
