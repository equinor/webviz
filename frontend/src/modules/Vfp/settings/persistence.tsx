import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { PressureOption, VfpParam } from "../types";

import { selectedPressureOptionAtom } from "./atoms/baseAtoms";
import {
    selectedAlqIndicesAtom,
    selectedColorByAtom,
    selectedEnsembleIdentAtom,
    selectedGfrIndicesAtom,
    selectedRealizationNumberAtom,
    selectedThpIndicesAtom,
    selectedVfpTableNameAtom,
    selectedWfrIndicesAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentString: string | null;
    selectedRealization: number | null;
    selectedVfpTableName: string | null;
    selectedThpIndices: number[] | null;
    selectedWfrIndices: number[] | null;
    selectedGfrIndices: number[] | null;
    selectedAlqIndices: number[] | null;
    selectedColorBy: VfpParam;
    selectedPressureOption: PressureOption;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentString: { type: "string", nullable: true },
        selectedRealization: { type: "int16", nullable: true },
        selectedVfpTableName: { type: "string", nullable: true },
        selectedThpIndices: { elements: { type: "int16" }, nullable: true },
        selectedWfrIndices: { elements: { type: "int16" }, nullable: true },
        selectedGfrIndices: { elements: { type: "int16" }, nullable: true },
        selectedAlqIndices: { elements: { type: "int16" }, nullable: true },
        selectedColorBy: { enum: Object.values(VfpParam) },
        selectedPressureOption: { enum: Object.values(PressureOption) },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentString = get(selectedEnsembleIdentAtom).value?.toString() || null;

    return {
        selectedEnsembleIdentString: selectedEnsembleIdentString,
        selectedRealization: get(selectedRealizationNumberAtom).value,
        selectedVfpTableName: get(selectedVfpTableNameAtom).value,
        selectedThpIndices: get(selectedThpIndicesAtom).value,
        selectedWfrIndices: get(selectedWfrIndicesAtom).value,
        selectedGfrIndices: get(selectedGfrIndicesAtom).value,
        selectedAlqIndices: get(selectedAlqIndicesAtom).value,
        selectedColorBy: get(selectedColorByAtom).value,
        selectedPressureOption: get(selectedPressureOptionAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdent = raw.selectedEnsembleIdentString
        ? RegularEnsembleIdent.fromString(raw.selectedEnsembleIdentString)
        : null;

    setIfDefined(set, selectedEnsembleIdentAtom, ensembleIdent);
    setIfDefined(set, selectedRealizationNumberAtom, raw.selectedRealization);
    setIfDefined(set, selectedVfpTableNameAtom, raw.selectedVfpTableName);
    setIfDefined(set, selectedThpIndicesAtom, raw.selectedThpIndices);
    setIfDefined(set, selectedWfrIndicesAtom, raw.selectedWfrIndices);
    setIfDefined(set, selectedGfrIndicesAtom, raw.selectedGfrIndices);
    setIfDefined(set, selectedAlqIndicesAtom, raw.selectedAlqIndices);
    setIfDefined(set, selectedColorByAtom, raw.selectedColorBy);
    setIfDefined(set, selectedPressureOptionAtom, raw.selectedPressureOption);
};
