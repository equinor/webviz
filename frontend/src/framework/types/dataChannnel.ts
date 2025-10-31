export type { ChannelContentDefinition } from "../internal/DataChannels/ChannelContent";
export type { ChannelDefinition } from "../internal/DataChannels/Channel";
export type { ChannelReceiverDefinition } from "../internal/DataChannels/ChannelReceiver";
export type { DataGenerator } from "../internal/DataChannels/ChannelContent";

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

export interface ChannelContentMetaData {
    readonly ensembleIdentString: string;
    readonly unit?: string;
    readonly displayString?: string;
    readonly preferredColor?: string;
}

export interface ChannelReceiverChannelContent<TKeyKinds extends KeyKind[]> {
    idString: string;
    displayName: string;
    dataArray: DataElement<KeyKindToKeyTypeMapping[TKeyKinds[number]]>[];
    metaData: ChannelContentMetaData;
}

export type ChannelReceiverReturnData<TKeyKinds extends KeyKind[]> = {
    readonly idString: string;
    readonly displayName: string;
    readonly isPending: boolean;
    readonly revisionNumber: number;
    readonly channel?: {
        readonly idString: string;
        readonly displayName: string;
        readonly moduleInstanceId: string;
        readonly kindOfKey: KeyKind | string;
        readonly contents: ChannelReceiverChannelContent<TKeyKinds>[];
    };
};
