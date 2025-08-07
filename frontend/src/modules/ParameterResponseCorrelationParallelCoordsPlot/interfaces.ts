import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { corrCutOffAtom, numParamsAtom, showLabelsAtom } from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    numParams: number;
    corrCutOff: number;
    showLabels: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    numParams: (get) => get(numParamsAtom),
    corrCutOff: (get) => get(corrCutOffAtom),
    showLabels: (get) => get(showLabelsAtom),
};
