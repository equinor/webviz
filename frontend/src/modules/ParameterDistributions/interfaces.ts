import type { ParameterIdent } from "@framework/EnsembleParameters";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedEnsembleModeAtom,
    histogramModeAtom,
    selectedVisualizationTypeAtom,
    showIndividualRealizationValuesAtom,
    showPercentilesAndMeanLinesAtom,
} from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedParameterIdentsAtom,
    selectedParameterSortingMethodAtom,
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
        // Like the parameters below: a retained but invalid selection (e.g. a removed ensemble) would otherwise be
        // plotted as a partial comparison, as the view skips ensembles missing from the ensemble set
        const selection = get(selectedEnsembleIdentsAtom);
        return selection.isValidInContext ? selection.value : [];
    },
    selectedParameterIdents: (get) => {
        // An invalid selection is retained for the user to repair, but must not be plotted meanwhile - e.g. a
        // parameter of a disabled category, or one missing from a newly added ensemble (a partial comparison)
        const selection = get(selectedParameterIdentsAtom);
        return selection.isValidInContext ? (selection.value ?? []) : [];
    },
    priorEnsembleIdent: (get) => {
        // The view only compares when both prior and posterior are set, so one invalid side blanks the plot
        const selection = get(selectedPriorEnsembleIdentAtom);
        return selection.isValidInContext ? selection.value : null;
    },
    posteriorEnsembleIdent: (get) => {
        const selection = get(selectedPosteriorEnsembleIdentAtom);
        return selection.isValidInContext ? selection.value : null;
    },
    ensembleMode: (get) => {
        return get(selectedEnsembleModeAtom);
    },
    parameterSortingMethod: (get) => {
        return get(selectedParameterSortingMethodAtom).value;
    },
};
