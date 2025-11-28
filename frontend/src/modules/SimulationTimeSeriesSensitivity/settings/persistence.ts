import { Frequency_api } from "@api";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import {
    resamplingFrequencyAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
} from "./atoms/baseAtoms";
import {
    selectedRegularEnsembleIdentAtom,
    selectedSensitivityNamesAtom,
    selectedVectorNameAndTagAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedEnsembleIdentString: string | null;
    selectedVectorName: string | null;
    selectedVectorTag: string | null;
    selectedSensitivityNames: string[] | null;
    resampleFrequency: Frequency_api | null;
    showStatistics: boolean;
    showRealizations: boolean;
    showHistorical: boolean;
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedEnsembleIdentString: { type: "string", nullable: true },
        selectedVectorName: { type: "string", nullable: true },
        selectedVectorTag: { type: "string", nullable: true },
        selectedSensitivityNames: { elements: { type: "string" }, nullable: true },
        resampleFrequency: { enum: Object.values(Frequency_api), nullable: true },
        showStatistics: { type: "boolean" },
        showRealizations: { type: "boolean" },
        showHistorical: { type: "boolean" },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentString = get(selectedRegularEnsembleIdentAtom).value?.toString() ?? null;
    return {
        selectedEnsembleIdentString: selectedEnsembleIdentString,
        selectedVectorName: get(selectedVectorNameAndTagAtom).value.name,
        selectedVectorTag: get(selectedVectorNameAndTagAtom).value.tag,
        selectedSensitivityNames: get(selectedSensitivityNamesAtom).value,
        resampleFrequency: get(resamplingFrequencyAtom),
        showStatistics: get(showStatisticsAtom),
        showRealizations: get(showRealizationsAtom),
        showHistorical: get(showHistoricalAtom),
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const selectedEnsembleIdent = raw.selectedEnsembleIdentString
        ? RegularEnsembleIdent.fromString(raw.selectedEnsembleIdentString)
        : undefined;

    let selectedVectorNameAndTag: { name: string | null; tag: string | null } | undefined = undefined;
    if (raw.selectedVectorTag !== null && raw.selectedVectorTag !== undefined) {
        selectedVectorNameAndTag = {
            name: raw.selectedVectorName ?? null,
            tag: raw.selectedVectorTag,
        };
    }

    setIfDefined(set, selectedRegularEnsembleIdentAtom, selectedEnsembleIdent);
    setIfDefined(set, selectedVectorNameAndTagAtom, selectedVectorNameAndTag);
    setIfDefined(set, selectedSensitivityNamesAtom, raw.selectedSensitivityNames);
    setIfDefined(set, resamplingFrequencyAtom, raw.resampleFrequency);
    setIfDefined(set, showStatisticsAtom, raw.showStatistics);
    setIfDefined(set, showRealizationsAtom, raw.showRealizations);
    setIfDefined(set, showHistoricalAtom, raw.showHistorical);
};
