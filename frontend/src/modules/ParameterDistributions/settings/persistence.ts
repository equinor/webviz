import { ParameterIdent } from "@framework/EnsembleParameters";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { setIfDefined } from "@framework/utils/atomUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { ParameterDistributionPlotType, EnsembleMode, HistogramMode } from "../typesAndEnums";
import { ParameterSortMethod } from "../view/utils/parameterSorting";

import {
    histogramModeAtom,
    selectedVisualizationTypeAtom,
    showConstantParametersAtom,
    showIndividualRealizationValuesAtom,
    showLogParametersAtom,
    showPercentilesAndMeanLinesAtom,
    selectedEnsembleModeAtom,
    selectedParameterSortingMethodAtom,
} from "./atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
} from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    selectedVisualizationType: ParameterDistributionPlotType;
    showIndividualRealizations: boolean;
    showPercentilesAndMeanLines: boolean;
    showConstantParameters: boolean;
    showLogParameters: boolean;
    histogramMode: HistogramMode;
    selectedEnsembleIdentStrings: string[];
    selectedPriorEnsembleIdentString: string | null;
    selectedPosteriorEnsembleIdentString: string | null;
    selectedEnsembleMode: EnsembleMode;
    selectedParameterSortingMethod: ParameterSortMethod;
    selectedParameterIdents: string[];
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        selectedVisualizationType: {
            enum: Object.values(ParameterDistributionPlotType),
        },
        showIndividualRealizations: { type: "boolean" },
        showPercentilesAndMeanLines: { type: "boolean" },
        showConstantParameters: { type: "boolean" },
        showLogParameters: { type: "boolean" },
        histogramMode: {
            enum: Object.values(HistogramMode),
        },
        selectedEnsembleIdentStrings: { elements: { type: "string" } },
        selectedPriorEnsembleIdentString: { type: "string", nullable: true },
        selectedPosteriorEnsembleIdentString: { type: "string", nullable: true },
        selectedEnsembleMode: {
            enum: Object.values(EnsembleMode),
        },
        selectedParameterSortingMethod: {
            enum: Object.values(ParameterSortMethod),
        },
        selectedParameterIdents: { elements: { type: "string" } },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentStrings = get(selectedEnsembleIdentsAtom).value.map((ident) => ident.toString());
    const selectedPriorEnsembleIdent = get(selectedPriorEnsembleIdentAtom).value?.toString() ?? null;
    const selectedPosteriorEnsembleIdent = get(selectedPosteriorEnsembleIdentAtom).value?.toString() ?? null;
    const selectedParameterIdents = get(selectedParameterIdentsAtom).value?.map((ident) => ident.toString()) ?? [];
    return {
        selectedVisualizationType: get(selectedVisualizationTypeAtom),
        showIndividualRealizations: get(showIndividualRealizationValuesAtom),
        showPercentilesAndMeanLines: get(showPercentilesAndMeanLinesAtom),
        showConstantParameters: get(showConstantParametersAtom),
        showLogParameters: get(showLogParametersAtom),
        histogramMode: get(histogramModeAtom),
        selectedEnsembleIdentStrings,
        selectedPriorEnsembleIdentString: selectedPriorEnsembleIdent,
        selectedPosteriorEnsembleIdentString: selectedPosteriorEnsembleIdent,
        selectedEnsembleMode: get(selectedEnsembleModeAtom),
        selectedParameterSortingMethod: get(selectedParameterSortingMethodAtom),
        selectedParameterIdents,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.selectedEnsembleIdentStrings?.map((str) => RegularEnsembleIdent.fromString(str)) ?? [];
    const priorEnsembleIdent = raw.selectedPriorEnsembleIdentString
        ? RegularEnsembleIdent.fromString(raw.selectedPriorEnsembleIdentString)
        : null;
    const posteriorEnsembleIdent = raw.selectedPosteriorEnsembleIdentString
        ? RegularEnsembleIdent.fromString(raw.selectedPosteriorEnsembleIdentString)
        : null;
    const parameterIdents = raw.selectedParameterIdents?.map((str) => ParameterIdent.fromString(str)) ?? [];

    setIfDefined(set, selectedVisualizationTypeAtom, raw.selectedVisualizationType);
    setIfDefined(set, showIndividualRealizationValuesAtom, raw.showIndividualRealizations);
    setIfDefined(set, showPercentilesAndMeanLinesAtom, raw.showPercentilesAndMeanLines);
    setIfDefined(set, showConstantParametersAtom, raw.showConstantParameters);
    setIfDefined(set, showLogParametersAtom, raw.showLogParameters);
    setIfDefined(set, histogramModeAtom, raw.histogramMode);
    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, selectedPriorEnsembleIdentAtom, priorEnsembleIdent);
    setIfDefined(set, selectedPosteriorEnsembleIdentAtom, posteriorEnsembleIdent);
    setIfDefined(set, selectedEnsembleModeAtom, raw.selectedEnsembleMode);
    setIfDefined(set, selectedParameterSortingMethodAtom, raw.selectedParameterSortingMethod);
    setIfDefined(set, selectedParameterIdentsAtom, parameterIdents);
};
