import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ParameterIdent } from "@framework/EnsembleParameters";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { selectedEnsembleIdentsAtom, selectedParameterIdentsAtom } from "./settings/atoms/derivedAtoms";
import { ParameterDistributionPlotType } from "./typesAndEnums";

export type Interface = {
    baseStates: {
        selectedVisualizationType: ParameterDistributionPlotType;
        showIndividualRealizationValues: boolean;
        showPercentilesAndMeanLines: boolean;
    };
    derivedStates: {
        selectedEnsembleIdents: EnsembleIdent[];
        selectedParameterIdents: ParameterIdent[];
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {
        selectedVisualizationType: ParameterDistributionPlotType.DISTRIBUTION_PLOT,
        showIndividualRealizationValues: false,
        showPercentilesAndMeanLines: false,
    },
    derivedStates: {
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedParameterIdents: (get) => {
            return get(selectedParameterIdentsAtom);
        },
    },
};
