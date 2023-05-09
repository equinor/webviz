import { BroadcastChannelDataTypes, BroadcastChannelDataTypesMapping } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    TimeSeries = "timeseries",
}

export type BroadcastChannelTypes = {
    [BroadcastChannelNames.TimeSeries]: { key: number; datetime: number; value: number }[];
};

export const broadcastChannelNames = Object.values(BroadcastChannelNames);

export const broadcastChannelTypes = {
    [BroadcastChannelNames.TimeSeries]: {
        realization: BroadcastChannelDataTypes.realization,
        datetime: BroadcastChannelDataTypes.datetime,
        value: BroadcastChannelDataTypes.value,
    },
};
