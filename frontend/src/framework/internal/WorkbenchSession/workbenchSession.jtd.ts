import { SyncSettingKey } from "@framework/SyncSettings";
import type { JTDSchemaType } from "ajv/dist/jtd";

import type { LayoutElement, ModuleInstanceStateAndLayoutInfo, SerializedDashboard } from "./Dashboard";
import type {
    SerializedDeltaEnsemble,
    SerializedEnsembleSet,
    SerializedRegularEnsemble,
    WorkbenchSessionContent,
    WorkbenchSessionMetadata,
} from "./PrivateWorkbenchSession";
import type { SerializedWorkbenchSession } from "./WorkbenchSessionSerializer";

const layoutElementSchema: JTDSchemaType<LayoutElement> = {
    properties: {
        moduleName: { type: "string" },
        relX: { type: "float32" },
        relY: { type: "float32" },
        relHeight: { type: "float32" },
        relWidth: { type: "float32" },
    },
    optionalProperties: {
        moduleInstanceId: { type: "string" },
        minimized: { type: "boolean" },
        maximized: { type: "boolean" },
    },
} as const;

const moduleInstanceSchema: JTDSchemaType<ModuleInstanceStateAndLayoutInfo> = {
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
                enum: [SyncSettingKey.CAMERA_POSITION_INTERSECTION],
            },
        },
        dataChannelReceiverSubscriptions: {
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
        layoutInfo: layoutElementSchema,
    },
} as const;

const dashboardSchema: JTDSchemaType<SerializedDashboard> = {
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        activeModuleInstanceId: { type: "string", nullable: true },
        moduleInstances: {
            elements: moduleInstanceSchema,
        },
    },
    optionalProperties: {
        description: { type: "string" },
    },
} as const;

export const regularEnsembleSchema: JTDSchemaType<SerializedRegularEnsemble> = {
    properties: {
        ensembleIdent: { type: "string" },
        color: { type: "string" },
        name: { type: "string", nullable: true },
    },
} as const;

export const deltaEnsembleSchema: JTDSchemaType<SerializedDeltaEnsemble> = {
    properties: {
        referenceEnsembleIdent: { type: "string" },
        comparisonEnsembleIdent: { type: "string" },
        color: { type: "string" },
        name: { type: "string", nullable: true },
    },
} as const;

export const ensembleSetSchema: JTDSchemaType<SerializedEnsembleSet> = {
    properties: {
        regularEnsembles: {
            elements: regularEnsembleSchema,
        },
        deltaEnsembles: {
            elements: deltaEnsembleSchema,
        },
    },
} as const;

export const workbenchSessionContentSchema: JTDSchemaType<WorkbenchSessionContent> = {
    properties: {
        activeDashboardId: { type: "string", nullable: true },
        dashboards: {
            elements: dashboardSchema,
        },
        ensembleSet: ensembleSetSchema,
    },
} as const;

export const workbenchSessionMetadataSchema: JTDSchemaType<WorkbenchSessionMetadata> = {
    properties: {
        title: { type: "string" },
    },
    optionalProperties: {
        description: { type: "string" },
    },
} as const;

export const workbenchSessionSchema: JTDSchemaType<SerializedWorkbenchSession> = {
    properties: {
        metadata: workbenchSessionMetadataSchema,
        content: workbenchSessionContentSchema,
    },
} as const;
