import type { JTDSchemaType } from "ajv/dist/jtd";

import {
    REALIZATION_FILTER_SET_STATE_SCHEMA,
    type SerializedRealizationFilterSetState,
} from "@framework/RealizationFilterSet.schema";
import {
    USER_CREATED_ITEMS_JTD_SCHEMA,
    type SerializedUserCreatedItemsState,
} from "@framework/UserCreatedItems.schema";

import { DASHBOARD_STATE_SCHEMA, type SerializedDashboardState } from "../Dashboard.schema";
import {
    WORKBENCH_SETTINGS_STATE_SCHEMA,
    type SerializedWorkbenchSettingsState,
} from "../PrivateWorkbenchSettings.schema";

import type {
    SerializedDeltaEnsemble,
    SerializedEnsembleSet,
    SerializedRegularEnsemble,
    WorkbenchSessionMetadata,
} from "./PrivateWorkbenchSession";

export type SerializedWorkbenchSessionState = {
    metadata: WorkbenchSessionMetadata;
    content: SerializedWorkbenchSessionContentState;
};

export type SerializedWorkbenchSessionContentState = {
    activeDashboardId: string | null;
    dashboards: SerializedDashboardState[];
    ensembleSet: SerializedEnsembleSet;
    ensembleRealizationFilterSet: SerializedRealizationFilterSetState;
    settings: SerializedWorkbenchSettingsState;
    userCreatedItems: SerializedUserCreatedItemsState;
};

export const REGULAR_ENSEMBLE_STATE_SCHEMA: JTDSchemaType<SerializedRegularEnsemble> = {
    properties: {
        ensembleIdent: { type: "string" },
        color: { type: "string" },
        name: { type: "string", nullable: true },
    },
} as const;

export const DELTA_ENSEMBLE_STATE_SCHEMA: JTDSchemaType<SerializedDeltaEnsemble> = {
    properties: {
        referenceEnsembleIdent: { type: "string" },
        comparisonEnsembleIdent: { type: "string" },
        color: { type: "string" },
        name: { type: "string", nullable: true },
    },
} as const;

export const ENSEMBLE_SET_STATE_SCHEMA: JTDSchemaType<SerializedEnsembleSet> = {
    properties: {
        regularEnsembles: {
            elements: REGULAR_ENSEMBLE_STATE_SCHEMA,
        },
        deltaEnsembles: {
            elements: DELTA_ENSEMBLE_STATE_SCHEMA,
        },
    },
} as const;

export const WORKBENCH_SESSION_METADATA_STATE_SCHEMA: JTDSchemaType<WorkbenchSessionMetadata> = {
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

export const WORKBENCH_SESSION_CONTENT_STATE_SCHEMA: JTDSchemaType<SerializedWorkbenchSessionContentState> = {
    properties: {
        activeDashboardId: { type: "string", nullable: true },
        dashboards: {
            elements: DASHBOARD_STATE_SCHEMA,
        },
        settings: WORKBENCH_SETTINGS_STATE_SCHEMA,
        ensembleSet: ENSEMBLE_SET_STATE_SCHEMA,
        ensembleRealizationFilterSet: REALIZATION_FILTER_SET_STATE_SCHEMA,
        userCreatedItems: USER_CREATED_ITEMS_JTD_SCHEMA,
    },
} as const;

export const WORKBENCH_SESSION_STATE_SCHEMA: JTDSchemaType<SerializedWorkbenchSessionState> = {
    properties: {
        metadata: WORKBENCH_SESSION_METADATA_STATE_SCHEMA,
        content: WORKBENCH_SESSION_CONTENT_STATE_SCHEMA,
    },
} as const;
