import type { JTDSchemaType } from "ajv/dist/core";

import {
    INTERSECTION_POLYLINES_STATE_SCHEMA,
    type SerializedIntersectionPolylinesState,
} from "./userCreatedItems/IntersectionPolylines.schema";

export type SerializedUserCreatedItemsState = {
    intersectionPolylines: SerializedIntersectionPolylinesState;
};

export const USER_CREATED_ITEMS_JTD_SCHEMA: JTDSchemaType<SerializedUserCreatedItemsState> = {
    properties: {
        intersectionPolylines: INTERSECTION_POLYLINES_STATE_SCHEMA,
    },
} as const;
