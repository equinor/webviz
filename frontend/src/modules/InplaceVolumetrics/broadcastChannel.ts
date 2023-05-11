import { BroadcastChannelKeyCategory, BroadcastChannelValueType } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
}

export const broadcastChannelNames = Object.values(BroadcastChannelNames);

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Response]: {
        key: BroadcastChannelKeyCategory.Realization as const,
        value: BroadcastChannelValueType.Numeric as const,
    },
};
