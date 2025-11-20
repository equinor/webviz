import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import type { Vec3 } from "@lib/utils/vec3";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";
import type { ViewStateType } from "@webviz/subsurface-viewer";

import { viewStateAtom } from "./atoms/baseAtoms";

type PersistableViewState = {
    rotationOrbit: number;
    rotationX: number;
    target?: Vec3;
    zoom?: number;
    minZoom?: number;
    maxZoom?: number;
    maxRotationX?: number;
    minRotationX?: number;
};

type ExtendedViewStateType = ViewStateType & {
    maxRotationX?: number;
    minRotationX?: number;
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
                target: inject("Vec3"),
                zoom: { type: "float64" },
                minZoom: { type: "float64" },
                maxZoom: { type: "float64" },
                maxRotationX: { type: "float64" },
                minRotationX: { type: "float64" },
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

export const deserializeView: DeserializeStateFunction<SerializedView> = () => {
    /*
    We are not applying the view state yet, as this is setting an incorrect camera position. 
    We have to investigate further if the view state is properly implemented in wsc
    and how to best restore it on module load.
    */
    // setIfDefined(set, viewStateAtom, raw.viewState ? convertFromPersistableViewState(raw.viewState) : null);
};

function convertToPersistableViewState(viewState: ExtendedViewStateType): PersistableViewState {
    return {
        rotationOrbit: viewState.rotationOrbit,
        rotationX: viewState.rotationX,
        minZoom: viewState.minZoom,
        maxZoom: viewState.maxZoom,
        target: viewState.target
            ? {
                  x: viewState.target[0],
                  y: viewState.target[1],
                  z: viewState.target[2] ?? 0,
              }
            : undefined,
        zoom: typeof viewState.zoom === "number" ? viewState.zoom : undefined,
        maxRotationX: viewState.maxRotationX,
        minRotationX: viewState.minRotationX,
    };
}

export function convertFromPersistableViewState(persistableViewState: PersistableViewState): ExtendedViewStateType {
    return {
        rotationOrbit: persistableViewState.rotationOrbit,
        rotationX: persistableViewState.rotationX,
        target: persistableViewState.target
            ? [persistableViewState.target.x, persistableViewState.target.y]
            : undefined,
        zoom: persistableViewState.zoom,
        minZoom: persistableViewState.minZoom,
        maxZoom: persistableViewState.maxZoom,
        maxRotationX: persistableViewState.maxRotationX,
        minRotationX: persistableViewState.minRotationX,
    };
}
