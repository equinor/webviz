import { BroadcastChannelDataFormat, BroadcastChannelDataTypes } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response",
}

export const broadcastChannelNames = Object.values(BroadcastChannelNames);

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Response]: {
        type: BroadcastChannelDataFormat.Array as const,
        data: {
            realization: BroadcastChannelDataTypes.realization,
            value: BroadcastChannelDataTypes.value,
        },
    },
};
