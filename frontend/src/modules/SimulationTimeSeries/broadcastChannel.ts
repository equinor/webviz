import { BroadcastChannelDataFormat, BroadcastChannelDataTypes } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Realization_Value]: {
        type: BroadcastChannelDataFormat.KeyValuePairs as const,
        data: {
            key: BroadcastChannelDataTypes.realization as const,
            value: BroadcastChannelDataTypes.value as const,
        },
    },
};
