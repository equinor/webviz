import { BroadcastChannelKeyCategory, BroadcastChannelValueType } from "@framework/Broadcaster";

export enum BroadcastChannelNames {
    Response = "Response (per realization)",
}

export const broadcastChannelsDef = {
    [BroadcastChannelNames.Response]: {
        key: BroadcastChannelKeyCategory.Realization,
        value: BroadcastChannelValueType.Numeric,
    },
};
