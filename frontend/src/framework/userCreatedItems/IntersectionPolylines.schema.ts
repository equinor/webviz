import type { JTDSchemaType } from "ajv/dist/core";

import type { IntersectionPolyline } from "./IntersectionPolylines";


export type SerializedIntersectionPolylinesState = {
    intersectionPolylines: IntersectionPolyline[];
};

export const INTERSECTION_POLYLINES_STATE_SCHEMA: JTDSchemaType<SerializedIntersectionPolylinesState> = {
    properties: {
        intersectionPolylines: {
            elements: {
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    color: { type: "string" },
                    path: {
                        elements: {
                            elements: { type: "float64" },
                        },
                    },
                    fieldId: { type: "string" },
                },
            },
        },
    },
} as const;
