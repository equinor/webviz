import type { JTDSchemaType } from "ajv/dist/core";

import {
    DATA_CHANNEL_MANAGER_STATE_SCHEMA,
    type SerializedDataChannelManagerState,
} from "./internal/DataChannels/ChannelManager.schema";
import { SyncSettingKey } from "./SyncSettings";

type StringifiedSerializedModuleState = {
    settings?: string;
    view?: string;
};

export type SerializedModuleInstanceState = {
    id: string;
    name: string;
    dataChannelManagerState: SerializedDataChannelManagerState;
    syncedSettingKeys: SyncSettingKey[];
    serializedState: StringifiedSerializedModuleState | null;
};

export const MODULE_INSTANCE_STATE_SCHEMA: JTDSchemaType<SerializedModuleInstanceState> = {
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        serializedState: {
            optionalProperties: {
                view: { type: "string" },
                settings: { type: "string" },
            },
            nullable: true,
        },
        syncedSettingKeys: {
            elements: {
                enum: Object.values(SyncSettingKey),
            },
        },
        dataChannelManagerState: DATA_CHANNEL_MANAGER_STATE_SCHEMA,
    },
} as const;
