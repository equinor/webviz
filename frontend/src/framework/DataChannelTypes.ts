export type { ContentDefinition } from "./internal/DataChannels/Content";
export type { ChannelDefinition } from "./internal/DataChannels/Channel";
export type { SubscriberDefinition } from "./internal/DataChannels/Subscriber";

export enum KeyKind {
    TimestampMs = "timestamp-ms",
    Realization = "realization",
    GridIndex = "grid-index",
    GridIJK = "grid-ijk",
    MeasuredDepth = "measured-depth",
}

export enum Type {
    Number = "number",
    String = "string",
    NumberTriplet = "number-triplet",
}

export interface KeyKindToTypeMapping {
    [KeyKind.TimestampMs]: Type.Number;
    [KeyKind.Realization]: Type.Number;
    [KeyKind.GridIndex]: Type.Number;
    [KeyKind.GridIJK]: Type.NumberTriplet;
    [KeyKind.MeasuredDepth]: Type.Number;
}

export interface Data<TKeyType extends Type, TValueType extends Type> {
    key: TypeToTypeScriptTypeMapping[TKeyType];
    value: TypeToTypeScriptTypeMapping[TValueType];
}

export type TypeToTypeScriptTypeMapping = {
    [Type.Number]: number;
    [Type.String]: string;
    [Type.NumberTriplet]: [number, number, number];
};
