import type { ViewStateType } from "@webviz/subsurface-viewer";
import type { JTDSchemaType } from "ajv/dist/core";

import type { ModuleStateSchema } from "@framework/Module";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

export type SerializedState = {
    settings: {
        dataProviderData: string;
    };
    view: {
        cameraPosition: ViewStateType;
    };
};

const settingsBuilder = new SchemaBuilder<SerializedState["settings"]>(() => ({
    properties: {
        dataProviderData: {
            type: "string",
        },
    },
}));

const viewBuilder = new SchemaBuilder<SerializedState["view"]>(({ inject }) => ({
    properties: {
        cameraPosition: inject("ViewState") as JTDSchemaType<ViewStateType>,
    },
}));

export const SERIALIZED_STATE: ModuleStateSchema<SerializedState> = {
    settings: settingsBuilder.build(),
    view: viewBuilder.build(),
} as const;
