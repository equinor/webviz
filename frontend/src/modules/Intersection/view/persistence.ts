import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import type { PersistedViewLink } from "./atoms/baseAtoms";
import { viewLinksAtom } from "./atoms/baseAtoms";

export type SerializedView = {
    viewLinks: PersistedViewLink[];
};

const schemaBuilder = new SchemaBuilder<SerializedView>(() => ({
    properties: {
        viewLinks: {
            elements: {
                properties: {
                    id: { type: "string" },
                    color: { type: "string" },
                    viewIds: { elements: { type: "string" } },
                    viewport: { nullable: true, elements: { type: "float64" as const } },
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
    return {
        viewLinks: get(viewLinksAtom),
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, viewLinksAtom, raw.viewLinks);
};
