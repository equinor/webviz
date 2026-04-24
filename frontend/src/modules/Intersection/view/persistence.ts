import type { JTDSchemaType } from "ajv/dist/jtd";

import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import type { Viewport } from "@framework/types/viewport";
import { setIfDefined } from "@framework/utils/atomUtils";
import { FitInViewStatus } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import type { UnlinkedViewState } from "../typesAndEnums";

import { unlinkedViewStateMapAtom, viewLinksAtom } from "./atoms/baseAtoms";
import type { ViewLink } from "./components/ViewLinkManager";

export type SerializedView = {
    viewLinks: ViewLink[];
    unlinkedViewStateMap: Record<string, UnlinkedViewState>;
};

// JTD has no tuple type — use elements with a cast for fixed-length arrays
const NULLABLE_VIEWPORT_SCHEMA = {
    nullable: true,
    elements: { type: "float64" },
} as JTDSchemaType<Viewport | null>;

const VIEWPORT_SCHEMA = {
    elements: { type: "float64" },
} as JTDSchemaType<Viewport>;

const VIEW_LINK_SCHEMA = {
    properties: {
        id: { type: "string" as const },
        color: { type: "string" as const },
        viewIds: { elements: { type: "string" as const } },
        viewport: NULLABLE_VIEWPORT_SCHEMA,
        viewportSourceViewId: { nullable: true, type: "string" as const },
        verticalScale: { type: "float64" as const },
        fitInViewStatus: { enum: [FitInViewStatus.ON, FitInViewStatus.OFF] },
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
        unlinkedViewStateMap: {
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
    const unlinkedViewStateMap = get(unlinkedViewStateMapAtom);

    return {
        viewLinks: viewLinks ?? [],
        unlinkedViewStateMap: unlinkedViewStateMap ?? {},
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    const viewLinks = (raw.viewLinks ?? []).map((link) => ({
        ...link,
        fitInViewStatus: link.fitInViewStatus ?? FitInViewStatus.OFF,
    }));
    setIfDefined(set, viewLinksAtom, viewLinks);
    setIfDefined(set, unlinkedViewStateMapAtom, raw.unlinkedViewStateMap ?? {});
};
