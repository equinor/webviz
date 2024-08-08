import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedVisualizationTypeAtom,
    showIndividualRealizationValuesAtom,
    showPercentilesAndMeanLinesAtom,
} from "./settings/atoms/baseAtoms";
import { selectedEnsembleIdentsAtom, selectedParameterIdentsAtom } from "./settings/atoms/derivedAtoms";
import { ParameterDistributionPlotType } from "./typesAndEnums";

type SettingsToViewInterface = {
    selectedVisualizationType: ParameterDistributionPlotType;
    showIndividualRealizationValues: boolean;
    showPercentilesAndMeanLines: boolean;
    selectedEnsembleIdents: EnsembleIdent[];
    selectedParameterIdents: ParameterIdent[];
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
};
