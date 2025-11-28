import { Frequency_api, StatisticFunction_api } from "@api";
import type { DeserializeStateFunction, SerializeStateFunction } from "@framework/Module";
import { setIfDefined } from "@framework/utils/atomUtils";
import { getEnsembleIdentsFromStrings } from "@framework/utils/ensembleIdentUtils";
import { SchemaBuilder } from "@modules/_shared/jtd-schemas/SchemaBuilder";

import { FanchartStatisticOption, GroupBy, SubplotLimitDirection, VisualizationMode } from "../typesAndEnums";

import {
    colorRealizationsByParameterAtom,
    groupByAtom,
    resampleFrequencyAtom,
    selectedVectorTagsAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    subplotLimitDirectionAtom,
    subplotMaxDirectionElementsAtom,
    visualizationModeAtom,
} from "./atoms/baseAtoms";
import { selectedEnsembleIdentsAtom, selectedParameterIdentStringAtom } from "./atoms/persistableFixableAtoms";

export type SerializedSettings = {
    subplotLimitDirection: SubplotLimitDirection;
    subplotMaxDirectionElements: number;
    groupBy: GroupBy;
    resampleFrequency: Frequency_api | null;
    ensembleIdentStrings: string[] | null;
    showHistorical: boolean;
    showObservations: boolean;
    selectedVectorTags: string[];
    colorRealizationsByParameter: boolean;
    selectedParameterIdentString: string | null;
    visualizationMode: VisualizationMode;
    individualStatisticsSelection: StatisticFunction_api[];
    fanchartStatisticsSelection: FanchartStatisticOption[];
};

const schemaBuilder = new SchemaBuilder<SerializedSettings>(() => ({
    properties: {
        subplotLimitDirection: { enum: Object.values(SubplotLimitDirection) },
        subplotMaxDirectionElements: { type: "int16" },
        groupBy: { enum: Object.values(GroupBy) },
        resampleFrequency: { enum: Object.values(Frequency_api), nullable: true },
        ensembleIdentStrings: { elements: { type: "string" }, nullable: true },
        showHistorical: { type: "boolean" },
        showObservations: { type: "boolean" },
        selectedVectorTags: { elements: { type: "string" } },
        visualizationMode: { enum: Object.values(VisualizationMode) },
        colorRealizationsByParameter: { type: "boolean" },
        selectedParameterIdentString: { type: "string", nullable: true },
        individualStatisticsSelection: { elements: { enum: Object.values(StatisticFunction_api) } },
        fanchartStatisticsSelection: { elements: { enum: Object.values(FanchartStatisticOption) } },
    },
}));

export const SERIALIZED_SETTINGS_SCHEMA = schemaBuilder.build();

export const serializeSettings: SerializeStateFunction<SerializedSettings> = (get) => {
    const selectedEnsembleIdentStrings =
        get(selectedEnsembleIdentsAtom).value?.map((ident) => ident.toString()) ?? null;

    return {
        subplotLimitDirection: get(subplotLimitDirectionAtom),
        subplotMaxDirectionElements: get(subplotMaxDirectionElementsAtom),
        groupBy: get(groupByAtom),
        resampleFrequency: get(resampleFrequencyAtom),
        ensembleIdentStrings: selectedEnsembleIdentStrings,
        showHistorical: get(showHistoricalAtom),
        showObservations: get(showObservationsAtom),
        selectedVectorTags: get(selectedVectorTagsAtom),
        visualizationMode: get(visualizationModeAtom),
        colorRealizationsByParameter: get(colorRealizationsByParameterAtom),
        selectedParameterIdentString: get(selectedParameterIdentStringAtom).value,
        individualStatisticsSelection: get(statisticsSelectionAtom).IndividualStatisticsSelection,
        fanchartStatisticsSelection: get(statisticsSelectionAtom).FanchartStatisticsSelection,
    };
};

export const deserializeSettings: DeserializeStateFunction<SerializedSettings> = (raw, set) => {
    const ensembleIdents = raw.ensembleIdentStrings
        ? getEnsembleIdentsFromStrings(raw.ensembleIdentStrings)
        : undefined;
    const statisticsSelection = {
        IndividualStatisticsSelection: raw.individualStatisticsSelection ?? Object.values(StatisticFunction_api),
        FanchartStatisticsSelection: raw.fanchartStatisticsSelection ?? Object.values(FanchartStatisticOption),
    };

    setIfDefined(set, subplotLimitDirectionAtom, raw.subplotLimitDirection);
    setIfDefined(set, subplotMaxDirectionElementsAtom, raw.subplotMaxDirectionElements);
    setIfDefined(set, groupByAtom, raw.groupBy);
    setIfDefined(set, resampleFrequencyAtom, raw.resampleFrequency);
    setIfDefined(set, selectedEnsembleIdentsAtom, ensembleIdents);
    setIfDefined(set, showHistoricalAtom, raw.showHistorical);
    setIfDefined(set, showObservationsAtom, raw.showObservations);
    setIfDefined(set, selectedVectorTagsAtom, raw.selectedVectorTags);
    setIfDefined(set, visualizationModeAtom, raw.visualizationMode);
    setIfDefined(set, colorRealizationsByParameterAtom, raw.colorRealizationsByParameter);
    setIfDefined(set, selectedParameterIdentStringAtom, raw.selectedParameterIdentString);
    setIfDefined(set, statisticsSelectionAtom, statisticsSelection);
};
