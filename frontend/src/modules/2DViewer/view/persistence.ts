import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import type { ViewStateType } from "@webviz/subsurface-viewer";
import type { JTDSchemaType } from "ajv/dist/core";
import { viewStateAtom } from "./atoms/persistableAtoms";

export type SerializedView = {
    cameraPosition: ViewStateType | null;
};

const viewBuilder = new SchemaBuilder<SerializedView>(({ inject }) => ({
    properties: {
        cameraPosition: {
            ...(inject("ViewState") as JTDSchemaType<ViewStateType>),
            nullable: true,
        },
    },
}));

export const SERIALIZED_VIEW = viewBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const cameraPosition = get(viewStateAtom);
    return {
        cameraPosition,
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    set(viewStateAtom, raw.cameraPosition);
};
