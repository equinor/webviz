import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceHydration } from "@framework/UniDirectionalSettingsToViewInterface";

import { ColorBy, PhaseType, PressureDependentVariable } from "./typesAndEnums";

export type State = Record<string, never>;

export type Interface = {
    baseStates: {
        selectedEnsembleIdents: EnsembleIdent[];
        selectedRealizations: number[];
        selectedPvtNums: number[];
        selectedPhases: PhaseType[];
        selectedColorBy: ColorBy;
        selectedPlots: PressureDependentVariable[];
    };
};

export const interfaceHydration: InterfaceHydration<Interface> = {
    baseStates: {
        selectedEnsembleIdents: [],
        selectedRealizations: [],
        selectedPvtNums: [],
        selectedPhases: [],
        selectedColorBy: ColorBy.ENSEMBLE,
        selectedPlots: [],
    },
};
