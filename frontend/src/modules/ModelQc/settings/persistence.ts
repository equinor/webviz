import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { gridCheckThresholdAtom } from "./atoms/baseAtoms";
import { selectedEnsembleIdentAtom, selectedGridNameAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentString: string | null;
    selectedGridName: string | null;
    gridCheckThreshold: number;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentString: { type: "string", nullable: true },
        selectedGridName: { type: "string", nullable: true },
        gridCheckThreshold: { type: "float64" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => ({
    selectedEnsembleIdentString: get(selectedEnsembleIdentAtom).value?.toString() ?? null,
    selectedGridName: get(selectedGridNameAtom).value,
    gridCheckThreshold: get(gridCheckThresholdAtom),
});

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const selectedEnsembleIdent = raw.selectedEnsembleIdentString
        ? RegularEnsembleIdent.fromString(raw.selectedEnsembleIdentString)
        : null;

    setIfDefined(set, selectedEnsembleIdentAtom, selectedEnsembleIdent);
    setIfDefined(set, selectedGridNameAtom, raw.selectedGridName);
    setIfDefined(set, gridCheckThresholdAtom, raw.gridCheckThreshold);
};
