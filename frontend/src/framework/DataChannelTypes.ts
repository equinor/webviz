export type { ChannelDefinitions } from "./internal/DataChannels/Channel";
export type { ContentDefinition } from "./internal/DataChannels/Content";
export type { SubscriberDefinitions } from "./internal/DataChannels/Subscriber";

export enum Genre {
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

export interface GenreType {
    [Genre.TimestampMs]: Type.Number;
    [Genre.Realization]: Type.Number;
    [Genre.GridIndex]: Type.Number;
    [Genre.GridIJK]: Type.NumberTriplet;
    [Genre.MeasuredDepth]: Type.Number;
}

export interface Data<TKeyType extends Type, TValueType extends Type> {
    key: TypeToTSTypeMapping[TKeyType];
    value: TypeToTSTypeMapping[TValueType];
}

export type TypeToTSTypeMapping = {
    [Type.Number]: number;
    [Type.String]: string;
    [Type.NumberTriplet]: [number, number, number];
};
