import type { JTDSchemaType } from "ajv/dist/jtd";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import type { Viewport } from "@framework/types/viewport";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { viewLinksAtom } from "./atoms/baseAtoms";
import type { ViewLink } from "./components/ViewLinkManager";

export type SerializedView = {
    viewLinks: ViewLink[];
};

// JTD has no tuple type — use elements with a cast for fixed-length arrays
const NULLABLE_VIEWPORT_SCHEMA = {
    nullable: true,
    elements: { type: "float64" },
} as JTDSchemaType<Viewport | null>;

const schemaBuilder = new SchemaBuilder<SerializedView>(() => ({
    properties: {
        viewLinks: {
            elements: {
                properties: {
                    id: { type: "string" },
                    color: { type: "string" },
                    viewIds: { elements: { type: "string" } },
                    viewport: NULLABLE_VIEWPORT_SCHEMA,
                    viewportSourceViewId: { nullable: true, type: "string" },
                    verticalScale: { type: "float64" },
                    bounds: {
                        nullable: true,
                        properties: {
                            x: { elements: { type: "float64" as const } },
                            y: { elements: { type: "float64" as const } },
                        },
                    },
                },
            },
        },
    },
}));

export const SERIALIZED_VIEW = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const viewLinks = get(viewLinksAtom);

    return {
        viewLinks: viewLinks ?? [],
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, viewLinksAtom, raw.viewLinks ?? []);
};
