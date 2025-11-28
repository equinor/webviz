import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { ColorBy, PhaseType, PressureDependentVariable } from "../typesAndEnums";

import { selectedColorByAtom, selectedDependentVariablesAtom, selectedPhaseAtom } from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedPvtNumsAtom,
    selectedRealizationNumbersAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentStrings: string[];
    selectedRealizationNumbers: number[];
    selectedPvtNums: number[];
    selectedPhase: PhaseType;
    selectedColorBy: ColorBy;
    selectedDependentVariables: PressureDependentVariable[];
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentStrings: { elements: { type: "string" } },
        selectedRealizationNumbers: { elements: { type: "int16" } },
        selectedPvtNums: { elements: { type: "int16" } },
        selectedPhase: { enum: Object.values(PhaseType) },
        selectedColorBy: { enum: Object.values(ColorBy) },
        selectedDependentVariables: { elements: { enum: Object.values(PressureDependentVariable) } },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentStrings = get(selectedEnsembleIdentsAtom).value.map((ident) => ident.toString());

    return {
        selectedEnsembleIdentStrings: selectedEnsembleIdentStrings,
        selectedRealizationNumbers: get(selectedRealizationNumbersAtom).value,
        selectedPvtNums: get(selectedPvtNumsAtom).value,
        selectedPhase: get(selectedPhaseAtom),
        selectedColorBy: get(selectedColorByAtom),
        selectedDependentVariables: get(selectedDependentVariablesAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.selectedEnsembleIdentStrings?.map((str) => RegularEnsembleIdent.fromString(str)) ?? [];

    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedRealizationNumbersAtom, raw.selectedRealizationNumbers);
    setIfDefined(set, selectedPvtNumsAtom, raw.selectedPvtNums);
    setIfDefined(set, selectedPhaseAtom, raw.selectedPhase);
    setIfDefined(set, selectedColorByAtom, raw.selectedColorBy);
    setIfDefined(set, selectedDependentVariablesAtom, raw.selectedDependentVariables);
};
