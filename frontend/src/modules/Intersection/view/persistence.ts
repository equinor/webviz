import type { JTDSchemaType } from "ajv/dist/jtd";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import type { Viewport } from "@framework/types/viewport";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import type { ViewStateMap } from "../typesAndEnums";

import { viewStateMapAtom, viewLinksAtom } from "./atoms/baseAtoms";
import type { ViewLink } from "./components/ViewLinkManager";

export type SerializedView = {
    viewLinks: ViewLink[];
    viewStateMap: ViewStateMap;
};

// JTD has no tuple type — use elements with a cast for fixed-length arrays
const NULLABLE_VIEWPORT_SCHEMA = {
    nullable: true,
    elements: { type: "float64" },
} as JTDSchemaType<Viewport | null>;

const VIEW_LINK_SCHEMA = {
    properties: {
        id: { type: "string" as const },
        color: { type: "string" as const },
        viewIds: { elements: { type: "string" as const } },
        viewportSourceViewId: { nullable: true, type: "string" as const },
        bounds: {
            nullable: true,
            properties: {
                x: { elements: { type: "float64" as const } },
                y: { elements: { type: "float64" as const } },
            },
        },
    },
} as unknown as JTDSchemaType<ViewLink>;

const schemaBuilder = new SchemaBuilder<SerializedView>(() => ({
    properties: {
        viewLinks: {
            elements: VIEW_LINK_SCHEMA,
        },
        viewStateMap: {
            values: {
                properties: {
                    viewport: NULLABLE_VIEWPORT_SCHEMA,
                    verticalScale: { type: "float64" },
                },
            },
        },
    },
}));

export const SERIALIZED_VIEW = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    const viewLinks = get(viewLinksAtom);
    const viewStateMap = get(viewStateMapAtom);

    return {
        viewLinks: viewLinks ?? [],
        viewStateMap: viewStateMap ?? {},
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    const viewLinks = (raw.viewLinks ?? []).map((link) => ({
        ...link,
    }));
    setIfDefined(set, viewLinksAtom, viewLinks);
    setIfDefined(set, viewStateMapAtom, raw.viewStateMap ?? {});
};
