import type { JTDSchemaType } from "ajv/dist/jtd";

export type SerializedDataChannelManagerState = {
    subscriptions: SerializedDataChannelReceiverSubscription[];
};

export type SerializedDataChannelReceiverSubscription = {
    idString: string;
    listensToModuleInstanceId: string;
    channelIdString: string;
    contentIdStrings: string[];
};

export const DATA_CHANNEL_MANAGER_STATE_SCHEMA: JTDSchemaType<SerializedDataChannelManagerState> = {
    properties: {
        subscriptions: {
            elements: {
                properties: {
                    idString: { type: "string" },
                    listensToModuleInstanceId: { type: "string" },
                    channelIdString: { type: "string" },
                    contentIdStrings: {
                        elements: { type: "string" },
                    },
                },
            },
        },
    },
    additionalProperties: false,
};
