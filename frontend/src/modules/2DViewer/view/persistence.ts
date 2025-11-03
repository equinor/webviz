import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import type { ViewStateType } from "@webviz/subsurface-viewer";
import type { JTDSchemaType } from "ajv/dist/core";

import { viewStateAtom } from "./atoms/persistableAtoms";

export type SerializedView = {
    cameraPosition: ViewStateType | null;
};

const schemaBuilder = new SchemaBuilder<SerializedView>(({ inject }) => ({
    properties: {
        cameraPosition: {
            ...(inject("ViewState") as JTDSchemaType<ViewStateType>),
            nullable: true,
        },
    },
}));

export const SERIALIZED_VIEW = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const cameraPosition = get(viewStateAtom);
    return {
        cameraPosition,
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, viewStateAtom, raw.cameraPosition);
};
