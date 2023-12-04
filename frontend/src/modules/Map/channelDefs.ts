import { ChannelDefinition, Genre, Type } from "@framework/DataChannelTypes";

export enum Channels {
    GridIJK = "Grid IJK",
}

export const channels: ChannelDefinition[] = [
    {
        ident: Channels.GridIJK,
        name: "Grid IJK",
        genre: Genre.GridIJK,
        dataType: Type.Number,
    },
];
