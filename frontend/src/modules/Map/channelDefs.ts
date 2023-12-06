import { KeyKind, KeyType, ModuleChannelDefinition } from "@framework/DataChannelTypes";

export enum Channels {
    GridIJK = "Grid IJK",
}

export const channels: ModuleChannelDefinition[] = [
    {
        idString: Channels.GridIJK,
        displayName: "Grid IJK",
        kindOfKey: KeyKind.GridIJK,
    },
];
