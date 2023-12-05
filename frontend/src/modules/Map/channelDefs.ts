import { ChannelDefinition, KeyKind, Type } from "@framework/DataChannelTypes";

export enum Channels {
    GridIJK = "Grid IJK",
}

export const channels: ChannelDefinition[] = [
    {
        ident: Channels.GridIJK,
        name: "Grid IJK",
        genre: KeyKind.GridIJK,
        dataType: Type.Number,
    },
];
