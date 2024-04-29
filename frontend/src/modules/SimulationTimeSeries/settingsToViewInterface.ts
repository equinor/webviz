import { Frequency_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import {
    colorRealizationsByParameterAtom,
    groupByAtom,
    resampleFrequencyAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    visualizationModeAtom,
} from "./settings/atoms/baseAtoms";
import { parameterIdentAtom, selectedEnsemblesAtom, vectorSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import { GroupBy, StatisticsSelection, VectorSpec, VisualizationMode } from "./typesAndEnums";

export type Interface = {
    derivedStates: {
        groupBy: GroupBy;
        visualizationMode: VisualizationMode;
        showObservations: boolean;
        showHistorical: boolean;
        vectorSpecifications: VectorSpec[];
        statisticsSelection: StatisticsSelection;
        colorByParameter: boolean;
        parameterIdent: ParameterIdent | null;
        selectedEnsembles: Ensemble[];
        resampleFrequency: Frequency_api | null;
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    derivedStates: {
        groupBy: (get) => {
            return get(groupByAtom);
        },
        visualizationMode: (get) => {
            return get(visualizationModeAtom);
        },
        showObservations: (get) => {
            return get(showObservationsAtom);
        },
        showHistorical: (get) => {
            return get(showHistoricalAtom);
        },
        vectorSpecifications: (get) => {
            return get(vectorSpecificationsAtom);
        },
        statisticsSelection: (get) => {
            return get(statisticsSelectionAtom);
        },
        colorByParameter: (get) => {
            return get(colorRealizationsByParameterAtom);
        },
        parameterIdent: (get) => {
            return get(parameterIdentAtom);
        },
        selectedEnsembles: (get) => {
            return get(selectedEnsemblesAtom);
        },
        resampleFrequency: (get) => {
            return get(resampleFrequencyAtom);
        },
    },
};
