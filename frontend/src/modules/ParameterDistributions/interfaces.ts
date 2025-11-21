import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedEnsembleModeAtom,
    selectedParameterSortingMethodAtom,
    histogramModeAtom,
    selectedVisualizationTypeAtom,
    showIndividualRealizationValuesAtom,
    showPercentilesAndMeanLinesAtom,
} from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { EnsembleMode, HistogramMode, ParameterDistributionPlotType } from "./typesAndEnums";
import type { ParameterSortMethod } from "./view/utils/parameterSorting";

type SettingsToViewInterface = {
    selectedVisualizationType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    histogramMode: HistogramMode;
    selectedEnsembleIdents: RegularEnsembleIdent[];
    selectedParameterIdents: ParameterIdent[];
    ensembleMode: EnsembleMode;
    parameterSortingMethod: ParameterSortMethod;
    priorEnsembleIdent: RegularEnsembleIdent | null;
    posteriorEnsembleIdent: RegularEnsembleIdent | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedVisualizationType: (get) => {
        return get(selectedVisualizationTypeAtom);
    },
    showIndividualRealizationValues: (get) => {
        return get(showIndividualRealizationValuesAtom);
    },
    showPercentilesAndMeanLines: (get) => {
        return get(showPercentilesAndMeanLinesAtom);
    },
    histogramMode: (get) => {
        return get(histogramModeAtom);
    },
    selectedEnsembleIdents: (get) => {
        return get(selectedEnsembleIdentsAtom).value;
    },
    selectedParameterIdents: (get) => {
        return get(selectedParameterIdentsAtom).value ?? [];
    },
    priorEnsembleIdent: (get) => {
        return get(selectedPriorEnsembleIdentAtom).value;
    },
    posteriorEnsembleIdent: (get) => {
        return get(selectedPosteriorEnsembleIdentAtom).value;
    },
    ensembleMode: (get) => {
        return get(selectedEnsembleModeAtom);
    },
    parameterSortingMethod: (get) => {
        return get(selectedParameterSortingMethodAtom);
    },
};
