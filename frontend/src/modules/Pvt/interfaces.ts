import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedColorByAtom, selectedDependentVariablesAtom, selectedPhaseAtom } from "./settings/atoms/baseAtoms";
import { pvtDataAccessorWithStatusAtom } from "./settings/atoms/derivedAtoms";
import { selectedEnsembleIdentsAtom, selectedPvtNumsAtom } from "./settings/atoms/persistableFixableAtoms";
import type { ColorBy, PhaseType, PressureDependentVariable, PvtDataAccessorWithStatus } from "./typesAndEnums";

type SettingsToViewInterface = {
    selectedPhase: PhaseType;
    selectedColorBy: ColorBy;
    selectedDependentVariables: PressureDependentVariable[];
    selectedEnsembleIdents: RegularEnsembleIdent[];
    selectedPvtNums: number[];
    pvtDataAccessorWithStatus: PvtDataAccessorWithStatus;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedPhase: (get) => {
        return get(selectedPhaseAtom);
    },
    selectedColorBy: (get) => {
        return get(selectedColorByAtom);
    },
    selectedDependentVariables: (get) => {
        return get(selectedDependentVariablesAtom);
    },
    selectedEnsembleIdents: (get) => {
        return get(selectedEnsembleIdentsAtom).value;
    },
    selectedPvtNums: (get) => {
        return get(selectedPvtNumsAtom).value;
    },
    pvtDataAccessorWithStatus: (get) => {
        return get(pvtDataAccessorWithStatusAtom);
    },
};
