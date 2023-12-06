export type { ModuleChannelContentDefinition } from "./internal/DataChannels/ModuleChannelContent";
export type { ModuleChannelDefinition } from "./internal/DataChannels/ModuleChannel";
export type { ModuleChannelReceiverDefinition } from "./internal/DataChannels/ModuleChannelReceiver";

export enum KeyKind {
    TimestampMs = "timestamp-ms",
    Realization = "realization",
    GridIndex = "grid-index",
    GridIJK = "grid-ijk",
    MeasuredDepth = "measured-depth",
}

export enum KeyType {
    Number = "number",
    NumberTriplet = "number-triplet",
}

export interface KeyKindToKeyTypeMapping {
    [KeyKind.TimestampMs]: KeyType.Number;
    [KeyKind.Realization]: KeyType.Number;
    [KeyKind.GridIndex]: KeyType.Number;
    [KeyKind.GridIJK]: KeyType.NumberTriplet;
    [KeyKind.MeasuredDepth]: KeyType.Number;
}

export interface DataElement<TKeyType extends KeyType> {
    key: KeyTypeToTypeScriptTypeMapping[TKeyType];
    value: number;
}

export type KeyTypeToTypeScriptTypeMapping = {
    [KeyType.Number]: number;
    [KeyType.NumberTriplet]: [number, number, number];
};
