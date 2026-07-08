import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { gridCheckThresholdAtom } from "./settings/atoms/baseAtoms";
import type { ResolvedTimeSteps } from "./settings/atoms/derivedAtoms";
import {
    availableRealizationsAtom,
    resolvedTimeStepsAtom,
    selectedEnsembleIdentValueAtom,
} from "./settings/atoms/derivedAtoms";
import { selectedGridNameAtom } from "./settings/atoms/persistableFixableAtoms";

type SettingsToViewInterface = {
    ensembleIdent: RegularEnsembleIdent | null;
    gridName: string | null;
    resolvedTimeSteps: ResolvedTimeSteps | null;
    gridCheckRealizations: number[];
    gridCheckThreshold: number;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdent: (get) => {
        return get(selectedEnsembleIdentValueAtom);
    },
    gridName: (get) => {
        return get(selectedGridNameAtom).value;
    },
    resolvedTimeSteps: (get) => {
        return get(resolvedTimeStepsAtom);
    },
    gridCheckRealizations: (get) => {
        return get(availableRealizationsAtom);
    },
    gridCheckThreshold: (get) => {
        return get(gridCheckThresholdAtom);
    },
};
