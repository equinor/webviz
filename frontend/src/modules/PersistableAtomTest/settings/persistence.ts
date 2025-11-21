import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { downstreamAtom, precomputedAtom, simpleNumberAtom, upstreamAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    simpleNumber: number;
    upstream: number;
    downstream: number;
    precomputed: number;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        simpleNumber: { type: "float64" },
        upstream: { type: "float64" },
        downstream: { type: "float64" },
        precomputed: { type: "float64" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        simpleNumber: get(simpleNumberAtom).value,
        upstream: get(upstreamAtom).value,
        downstream: get(downstreamAtom).value,
        precomputed: get(precomputedAtom).value,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    // Use PersistableAtomState to set source as PERSISTENCE
    setIfDefined(set, simpleNumberAtom, raw.simpleNumber);
    setIfDefined(set, upstreamAtom, raw.upstream);
    setIfDefined(set, downstreamAtom, raw.downstream);
    setIfDefined(set, precomputedAtom, raw.precomputed);
};
