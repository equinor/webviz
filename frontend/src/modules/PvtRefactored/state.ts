import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceHydration } from "@framework/UniDirectionalSettingsToViewInterface";

import { selectedEnsembleIdentsAtom, selectedPvtNumsAtom, selectedRealizationsAtom } from "./settings/atoms";
import { ColorBy, PhaseType, PressureDependentVariable } from "./typesAndEnums";

export type State = Record<string, never>;

export type Interface = {
    baseStates: {
        selectedPhase: PhaseType;
        selectedColorBy: ColorBy;
        selectedPlots: PressureDependentVariable[];
    };
    derivedStates: {
        selectedEnsembleIdents: EnsembleIdent[];
        selectedRealizations: number[];
        selectedPvtNums: number[];
    };
};

export const interfaceHydration: InterfaceHydration<Interface> = {
    baseStates: {
        selectedPhase: PhaseType.OIL,
        selectedColorBy: ColorBy.ENSEMBLE,
        selectedPlots: [
            PressureDependentVariable.FORMATION_VOLUME_FACTOR,
            PressureDependentVariable.DENSITY,
            PressureDependentVariable.VISCOSITY,
            PressureDependentVariable.FLUID_RATIO,
        ],
    },
    derivedStates: {
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedRealizations: (get) => {
            return get(selectedRealizationsAtom);
        },
        selectedPvtNums: (get) => {
            return get(selectedPvtNumsAtom);
        },
    },
};
