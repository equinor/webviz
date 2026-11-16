import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { numParamsAtom, corrCutOffAtom } from "./atoms/baseAtoms";

export type SerializedSettings = {
    numParams: number;
    corrCutOff: number;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        numParams: { type: "int16" },
        corrCutOff: { type: "float32" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    return {
        numParams: get(numParamsAtom),
        corrCutOff: get(corrCutOffAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(set, numParamsAtom, raw.numParams);
    setIfDefined(set, corrCutOffAtom, raw.corrCutOff);
};
