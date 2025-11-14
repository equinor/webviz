import type { JTDSchemaType } from "ajv/dist/core";

export const Point2DSchema: JTDSchemaType<number[]> = {
    elements: { type: "float32" },
} as const;
