import type { JTDSchemaType } from "ajv/dist/jtd";

import { USER_CREATED_ITEMS_JTD_SCHEMA } from "@framework/UserCreatedItems";

import { DASHBOARD_JTD_SCHEMA } from "../Dashboard";
import { WORKBENCH_SETTINGS_JTD_SCHEMA } from "../PrivateWorkbenchSettings";

import type {
    SerializedDeltaEnsemble,
    SerializedEnsembleSet,
    SerializedRegularEnsemble,
    WorkbenchSessionContent,
} from "./PrivateWorkbenchSession";
import type { SerializedWorkbenchSession } from "./utils/serialization";

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
            elements: DASHBOARD_JTD_SCHEMA,
        },
        settings: WORKBENCH_SETTINGS_JTD_SCHEMA,
        ensembleSet: ensembleSetSchema,
        userCreatedItems: USER_CREATED_ITEMS_JTD_SCHEMA,
    },
} as const;

export const workbenchSessionSchema: JTDSchemaType<SerializedWorkbenchSession> = {
    properties: {
        content: workbenchSessionContentSchema,
    },
} as const;
