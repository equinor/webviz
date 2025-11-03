import type { JTDSchemaType } from "ajv/dist/jtd";

import { USER_CREATED_ITEMS_JTD_SCHEMA } from "@framework/UserCreatedItems";

import { DASHBOARD_JTD_SCHEMA } from "../Dashboard";
import { WORKBENCH_SETTINGS_JTD_SCHEMA } from "../PrivateWorkbenchSettings";

import type {
    SerializedDeltaEnsemble,
    SerializedEnsembleSet,
    SerializedRegularEnsemble,
    WorkbenchSessionContent,
    WorkbenchSessionMetadata,
} from "./PrivateWorkbenchSession";
import type { SerializedWorkbenchSession } from "./utils/deserialization";
import { realizationFilterSetSchema } from "@framework/RealizationFilterSet";

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

export const workbenchSessionMetadataSchema: JTDSchemaType<WorkbenchSessionMetadata> = {
    properties: {
        title: { type: "string" },
        createdAt: { type: "float64" },
        updatedAt: { type: "float64" },
        lastModifiedMs: { type: "float64" },
    },
    optionalProperties: {
        description: { type: "string" },
        hash: { type: "string" },
    },
} as const;

export const workbenchSessionContentSchema: JTDSchemaType<WorkbenchSessionContent> = {
    properties: {
        activeDashboardId: { type: "string", nullable: true },
        dashboards: {
            elements: DASHBOARD_JTD_SCHEMA,
        },
        settings: WORKBENCH_SETTINGS_JTD_SCHEMA,
        ensembleSet: ensembleSetSchema,
        ensembleRealizationFilterSet: realizationFilterSetSchema,
        userCreatedItems: USER_CREATED_ITEMS_JTD_SCHEMA,
    },
} as const;

export const workbenchSessionSchema: JTDSchemaType<SerializedWorkbenchSession> = {
    properties: {
        metadata: workbenchSessionMetadataSchema,
        content: workbenchSessionContentSchema,
    },
} as const;
