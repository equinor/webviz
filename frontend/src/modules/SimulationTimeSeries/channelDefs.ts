import { BroadcastChannelKeyCategory, BroadcastChannelValueType } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Realization_Value]: {
        key: BroadcastChannelKeyCategory.Realization,
        value: BroadcastChannelValueType.Numeric,
    },
    [BroadcastChannelNames.Realization_Value_TEST]: {
        key: BroadcastChannelKeyCategory.Realization,
        value: BroadcastChannelValueType.Numeric,
    },
    [BroadcastChannelNames.Time_Value]: {
        key: BroadcastChannelKeyCategory.TimestampMs,
        value: BroadcastChannelValueType.Numeric,
    },
};
