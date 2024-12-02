import { Frequency_api } from "@api";
import { DeltaEnsemble } from "@framework/DeltaEnsemble";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { RegularEnsemble } from "@framework/RegularEnsemble";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    colorRealizationsByParameterAtom,
    groupByAtom,
    resampleFrequencyAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    visualizationModeAtom,
} from "./settings/atoms/baseAtoms";
import {
    parameterIdentAtom,
    selectedDeltaEnsemblesAtom,
    selectedRegularEnsemblesAtom,
    vectorSpecificationsAtom,
} from "./settings/atoms/derivedAtoms";
import { GroupBy, StatisticsSelection, VectorSpec, VisualizationMode } from "./typesAndEnums";

export type SettingsToViewInterface = {
    groupBy: GroupBy;
    visualizationMode: VisualizationMode;
    showObservations: boolean;
    showHistorical: boolean;
    vectorSpecifications: VectorSpec[];
    statisticsSelection: StatisticsSelection;
    colorByParameter: boolean;
    parameterIdent: ParameterIdent | null;
    selectedRegularEnsembles: RegularEnsemble[];
    selectedDeltaEnsembles: DeltaEnsemble[];
    resampleFrequency: Frequency_api | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
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
    selectedRegularEnsembles: (get) => {
        return get(selectedRegularEnsemblesAtom);
    },
    selectedDeltaEnsembles: (get) => {
        return get(selectedDeltaEnsemblesAtom);
    },
    resampleFrequency: (get) => {
        return get(resampleFrequencyAtom);
    },
};
