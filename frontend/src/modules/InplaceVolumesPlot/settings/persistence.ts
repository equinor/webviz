import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { persistedEnsembleIdentsAtom } from "./atoms/derivedAtoms";

export type SerializedSettings = {
    ensembleIdents: string[];
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        ensembleIdents: {
            elements: { type: "string" },
        },
    },
}));

export const SERIALIZED_SETTINGS = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdents = get(persistedEnsembleIdentsAtom);
    const selectedEnsembleIdentsString = selectedEnsembleIdents.value.map((ident) => ident.toString());
    return {
        ensembleIdents: selectedEnsembleIdentsString,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    setIfDefined(
        set,
        persistedEnsembleIdentsAtom,
        raw.ensembleIdents ? raw.ensembleIdents.map((id) => RegularEnsembleIdent.fromString(id)) : [],
    );
};
