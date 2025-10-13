import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedVisualizationTypeAtom,
    showIndividualRealizationValuesAtom,
    showPercentilesAndMeanLinesAtom,
} from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedEnsembleModeAtom,
    selectedParameterDistributionSortingMethodAtom,
    selectedParameterIdentsAtom,
    selectedPosteriorEnsembleIdentAtom,
    selectedPriorEnsembleIdentAtom,
} from "./settings/atoms/derivedAtoms";
import type { EnsembleMode, ParameterDistributionPlotType } from "./typesAndEnums";
import type { ParameterSortMethod } from "./view/utils/parameterSorting";

type SettingsToViewInterface = {
    selectedVisualizationType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
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
    selectedEnsembleIdents: (get) => {
        return get(selectedEnsembleIdentsAtom);
    },
    selectedParameterIdents: (get) => {
        return get(selectedParameterIdentsAtom);
    },
    priorEnsembleIdent: (get) => {
        return get(selectedPriorEnsembleIdentAtom);
    },
    posteriorEnsembleIdent: (get) => {
        return get(selectedPosteriorEnsembleIdentAtom);
    },
    ensembleMode: (get) => {
        return get(selectedEnsembleModeAtom);
    },
    parameterSortingMethod: (get) => {
        return get(selectedParameterDistributionSortingMethodAtom);
    },
};
