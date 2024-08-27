import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedColorByAtom, selectedDependentVariablesAtom, selectedPhaseAtom } from "./settings/atoms/baseAtoms";
import { selectedEnsembleIdentsAtom, selectedPvtNumsAtom } from "./settings/atoms/derivedAtoms";
import { pvtDataQueriesAtom } from "./settings/atoms/queryAtoms";
import { ColorBy, CombinedPvtDataResult, PhaseType, PressureDependentVariable } from "./typesAndEnums";

type SettingsToViewInterface = {
    selectedPhase: PhaseType;
    selectedColorBy: ColorBy;
    selectedDependentVariables: PressureDependentVariable[];
    selectedEnsembleIdents: EnsembleIdent[];
    selectedPvtNums: number[];
    pvtDataQueries: CombinedPvtDataResult;
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
        return get(selectedEnsembleIdentsAtom);
    },
    selectedPvtNums: (get) => {
        return get(selectedPvtNumsAtom);
    },
    pvtDataQueries: (get) => {
        return get(pvtDataQueriesAtom);
    },
};
