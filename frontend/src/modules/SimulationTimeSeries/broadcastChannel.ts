import { BroadcastChannelDataFormat, BroadcastChannelDataTypes } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    TimeSeries = "Time series",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.TimeSeries]: {
        type: BroadcastChannelDataFormat.Array as const,
        data: {
            realization: BroadcastChannelDataTypes.realization,
            datetime: BroadcastChannelDataTypes.datetime,
            value: BroadcastChannelDataTypes.value,
        },
    },
};
