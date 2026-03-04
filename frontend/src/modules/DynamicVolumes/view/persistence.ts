import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { activeTimestampUtcMsAtom } from "./atoms/baseAtoms";

export type SerializedView = {
    activeTimestampUtcMs: number | null;
};

const schemaBuilder = new SchemaBuilder<SerializedView>(() => ({
    properties: {
        activeTimestampUtcMs: { type: "float64", nullable: true },
    },
}));

export const SERIALIZED_VIEW_SCHEMA = schemaBuilder.build();

export const serializeView: SerializeStateFunction<SerializedView> = (get) => {
    return {
        activeTimestampUtcMs: get(activeTimestampUtcMsAtom),
    };
};

export const deserializeView: DeserializeStateFunction<SerializedView> = (raw, set) => {
    setIfDefined(set, activeTimestampUtcMsAtom, raw.activeTimestampUtcMs);
};
