import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { selectedEnsembleIdentsAtom, selectedPvtNumsAtom } from "./settings/atoms/derivedAtoms";
import { pvtDataQueriesAtom } from "./settings/atoms/queryAtoms";
import { ColorBy, CombinedPvtDataResult, PhaseType, PressureDependentVariable } from "./typesAndEnums";

export type State = Record<string, never>;

export type Interface = {
    baseStates: {
        selectedPhase: PhaseType;
        selectedColorBy: ColorBy;
        selectedDependentVariables: PressureDependentVariable[];
    };
    derivedStates: {
        selectedEnsembleIdents: EnsembleIdent[];
        selectedPvtNums: number[];
        pvtDataQueries: CombinedPvtDataResult;
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {
        selectedPhase: PhaseType.OIL,
        selectedColorBy: ColorBy.ENSEMBLE,
        selectedDependentVariables: [
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
        selectedPvtNums: (get) => {
            return get(selectedPvtNumsAtom);
        },
        pvtDataQueries: (get) => {
            return get(pvtDataQueriesAtom);
        },
    },
};
