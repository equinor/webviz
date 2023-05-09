import {
    BroadcastChannelDataTypes,
    BroadcastChannelDataTypesMapping,
    MapDataTypeToTSType,
} from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    TimeSeries = "Time series",
}

export const broadcastChannelNames = Object.values(BroadcastChannelNames);

export const broadcastChannelDefs = {
    [BroadcastChannelNames.TimeSeries]: {
        realization: BroadcastChannelDataTypes.realization,
        datetime: BroadcastChannelDataTypes.datetime,
        value: BroadcastChannelDataTypes.value,
    },
};

export type BroadcastChannelTypes = {
    [BroadcastChannelNames.TimeSeries]: MapDataTypeToTSType<
        (typeof broadcastChannelDefs)[BroadcastChannelNames.TimeSeries]
    >[];
};
