import type { JTDSchemaType } from "ajv/dist/core";

import type { Vec2 } from "@lib/utils/vec2";

export const VEC2_SCHEMA: JTDSchemaType<Vec2> = {
    properties: {
        x: { type: "float64" },
        y: { type: "float64" },
    },
};
