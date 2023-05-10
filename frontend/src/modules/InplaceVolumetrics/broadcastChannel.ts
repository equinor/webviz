import { BroadcastChannelDataFormat, BroadcastChannelDataTypes } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
}

export const broadcastChannelNames = Object.values(BroadcastChannelNames);

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Response]: {
        type: BroadcastChannelDataFormat.KeyValuePairs as const,
        data: {
            key: BroadcastChannelDataTypes.realization as const,
            value: BroadcastChannelDataTypes.value as const,
        },
    },
};
