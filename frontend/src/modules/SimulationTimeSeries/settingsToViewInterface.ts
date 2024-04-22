import { Ensemble } from "@framework/Ensemble";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import {
    colorRealizationsByParameterAtom,
    groupByAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    visualizationModeAtom,
} from "./settings/atoms/baseAtoms";
import { parameterIdentAtom, selectedEnsemblesAtom, vectorSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import { GroupBy, StatisticsSelection, VectorSpec, VisualizationMode } from "./typesAndEnums";

export type State = Record<string, never>;

export type Interface = {
    baseStates: {};
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
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {},
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
    },
};
