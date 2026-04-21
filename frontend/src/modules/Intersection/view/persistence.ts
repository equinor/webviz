import type { JTDSchemaType } from "ajv/dist/jtd";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import type { Viewport } from "@framework/types/viewport";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { standaloneViewportsAtom, viewLinksAtom } from "./atoms/baseAtoms";
import type { StandaloneViewportInfo, ViewLink } from "./components/ViewLinkManager";

export type SerializedView = {
    viewLinks: ViewLink[];
    standaloneViewports: Record<string, StandaloneViewportInfo>;
};

// JTD has no tuple type — use elements with a cast for fixed-length arrays
const NULLABLE_VIEWPORT_SCHEMA = {
    nullable: true,
    elements: { type: "float64" },
} as JTDSchemaType<Viewport | null>;

const VIEWPORT_SCHEMA = {
    elements: { type: "float64" },
} as JTDSchemaType<Viewport>;

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
        standaloneViewports: {
            values: {
                properties: {
                    viewport: VIEWPORT_SCHEMA,
                    verticalScale: { type: "float64" },
                },
            },
        },
    },
}));

export const SERIALIZED_VIEW = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const viewLinks = get(viewLinksAtom);
    const standaloneViewports = get(standaloneViewportsAtom);

    return {
        viewLinks: viewLinks ?? [],
        standaloneViewports: standaloneViewports ?? {},
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, viewLinksAtom, raw.viewLinks ?? []);
    setIfDefined(set, standaloneViewportsAtom, raw.standaloneViewports ?? {});
};
