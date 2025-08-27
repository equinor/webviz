import type { ViewStateType } from "@webviz/subsurface-viewer";
import type { JTDSchemaType } from "ajv/dist/core";

export const ViewStateSchema: JTDSchemaType<Omit<ViewStateType, "target" | "zoom">> = {
    properties: {
        rotationX: { type: "float32" },
        rotationOrbit: { type: "float32" },
    },
    optionalProperties: {
        minZoom: { type: "float32" },
        maxZoom: { type: "float32" },
        transitionDuration: { type: "float32" },
    },
} as const;
