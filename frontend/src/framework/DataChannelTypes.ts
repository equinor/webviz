export type { ChannelDefinition } from "./internal/DataChannels/Channel";
export type { ContentDefinition } from "./internal/DataChannels/Content";
export type { SubscriberDefinition } from "./internal/DataChannels/Subscriber";

export enum Genre {
    TimestampMs = "timestamp-ms",
    Realization = "realization",
    GridIndex = "grid-index",
    GridIJK = "grid-ijk",
    MeasuredDepth = "measured-depth",
}

export enum DataType {
    Numeric = "numeric",
    String = "string",
}

export interface Data<TValueType = number | string> {
    key: number | [number, number, number];
    value: TValueType;
}

export enum Type {
    Number = "number",
    String = "string",
    NumberTriplet = "number-triplet",
}

export type TypeToTSTypeMapping = {
    [Type.Number]: number;
    [Type.String]: string;
    [Type.NumberTriplet]: [number, number, number];
};
