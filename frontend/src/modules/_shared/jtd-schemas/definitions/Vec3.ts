import type { JTDSchemaType } from "ajv/dist/core";

import type { Vec3 } from "@lib/utils/vec3";

export const VEC3_SCHEMA: JTDSchemaType<Vec3> = {
    properties: {
        x: { type: "float64" },
        y: { type: "float64" },
        z: { type: "float64" },
    },
};
