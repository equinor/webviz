import type { ViewStateType } from "@webviz/subsurface-viewer";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import type { Vec2 } from "@lib/utils/vec2";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { viewStateAtom } from "./atoms/persistableAtoms";

type PersistableViewState = {
    rotationOrbit: number;
    rotationX: number;
    target?: Vec2;
    zoom?: number;
};

export type SerializedView = {
    viewState: PersistableViewState | null;
};

const schemaBuilder = new SchemaBuilder<SerializedView>(({ inject }) => ({
    properties: {
        viewState: {
            properties: {
                rotationOrbit: { type: "float64" },
                rotationX: { type: "float64" },
            },
            optionalProperties: {
                target: inject("Vec2"),
                zoom: { type: "float64" },
            },
            nullable: true,
        },
    },
}));

export const SERIALIZED_VIEW = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const viewState = get(viewStateAtom);
    return {
        viewState: viewState ? convertToPersistableViewState(viewState) : null,
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, viewStateAtom, raw.viewState ? convertFromPersistableViewState(raw.viewState) : null);
};

function convertToPersistableViewState(viewState: ViewStateType): PersistableViewState {
    return {
        rotationOrbit: viewState.rotationOrbit,
        rotationX: viewState.rotationX,
        target: viewState.target
            ? {
                  x: viewState.target[0],
                  y: viewState.target[1],
              }
            : undefined,
        zoom: typeof viewState.zoom === "number" ? viewState.zoom : undefined,
    };
}

export function convertFromPersistableViewState(persistableViewState: PersistableViewState): ViewStateType {
    return {
        rotationOrbit: persistableViewState.rotationOrbit,
        rotationX: persistableViewState.rotationX,
        target: persistableViewState.target
            ? [persistableViewState.target.x, persistableViewState.target.y]
            : undefined,
        zoom: persistableViewState.zoom,
    };
}
