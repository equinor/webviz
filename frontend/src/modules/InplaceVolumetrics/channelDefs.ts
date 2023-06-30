import { BroadcastChannelKeyCategory, BroadcastChannelValueType } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
    Test = "Test (per timestep)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Response]: {
        key: BroadcastChannelKeyCategory.Realization,
        value: BroadcastChannelValueType.Numeric,
    },
    [BroadcastChannelNames.Test]: {
        key: BroadcastChannelKeyCategory.TimestampMs,
        value: BroadcastChannelValueType.Numeric,
    },
};
