import type { JTDSchemaType } from "ajv/dist/core";

import { MODULE_INSTANCE_STATE_SCHEMA, type SerializedModuleInstanceState } from "@framework/ModuleInstance.schema";

import type { LayoutElement } from "./Dashboard";

type LayoutElementWithoutIdAndName = Omit<LayoutElement, "moduleInstanceId" | "moduleName">;

export type SerializedModuleInstanceAndLayoutState = {
    moduleInstanceState: SerializedModuleInstanceState;
    layoutState: LayoutElementWithoutIdAndName;
};

export type SerializedDashboardState = {
    id: string;
    name: string;
    description?: string;
    activeModuleInstanceId: string | null;
    moduleInstances: SerializedModuleInstanceAndLayoutState[];
};

const LAYOUT_ELEMENT_STATE_SCHEMA: JTDSchemaType<LayoutElementWithoutIdAndName> = {
    properties: {
        relX: { type: "float32" },
        relY: { type: "float32" },
        relHeight: { type: "float32" },
        relWidth: { type: "float32" },
    },
    optionalProperties: {
        minimized: { type: "boolean" },
        maximized: { type: "boolean" },
    },
} as const;

const MODULE_INSTANCE_AND_LAYOUT_STATE_SCHEMA: JTDSchemaType<SerializedModuleInstanceAndLayoutState> = {
    properties: {
        moduleInstanceState: MODULE_INSTANCE_STATE_SCHEMA,
        layoutState: LAYOUT_ELEMENT_STATE_SCHEMA,
    },
} as const;

export const DASHBOARD_STATE_SCHEMA: JTDSchemaType<SerializedDashboardState> = {
    properties: {
        id: { type: "string" },
        name: { type: "string" },
        activeModuleInstanceId: { type: "string", nullable: true },
        moduleInstances: {
            elements: MODULE_INSTANCE_AND_LAYOUT_STATE_SCHEMA,
        },
    },
    optionalProperties: {
        description: { type: "string" },
    },
} as const;
