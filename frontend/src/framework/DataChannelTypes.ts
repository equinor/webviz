export type { ChannelContentDefinition } from "./internal/DataChannels/ChannelContent";
export type { ChannelDefinition } from "./internal/DataChannels/Channel";
export type { ChannelReceiverDefinition } from "./internal/DataChannels/ChannelReceiver";
export type { DataGenerator, ChannelContentMetaData } from "./internal/DataChannels/ChannelContent";
export type { ChannelReceiverChannelContent } from "./internal/DataChannels/hooks/useChannelReceiver";

export enum KeyKind {
    TIMESTAMP_MS = "timestamp-ms",
    REALIZATION = "realization",
    GRID_INDEX = "grid-index",
    GRID_IJK = "grid-ijk",
    MEASURED_DEPTH = "measured-depth",
}

export enum KeyType {
    NUMBER = "number",
    NUMBER_TRIPLET = "number-triplet",
}

export interface KeyKindToKeyTypeMapping {
    [KeyKind.TIMESTAMP_MS]: KeyType.NUMBER;
    [KeyKind.REALIZATION]: KeyType.NUMBER;
    [KeyKind.GRID_INDEX]: KeyType.NUMBER;
    [KeyKind.GRID_IJK]: KeyType.NUMBER_TRIPLET;
    [KeyKind.MEASURED_DEPTH]: KeyType.NUMBER;
}

export interface DataElement<TKeyType extends KeyType> {
    key: KeyTypeToTypeScriptTypeMapping[TKeyType];
    value: number;
}

type KeyTypeToTypeScriptTypeMapping = {
    [KeyType.NUMBER]: number;
    [KeyType.NUMBER_TRIPLET]: [number, number, number];
};
