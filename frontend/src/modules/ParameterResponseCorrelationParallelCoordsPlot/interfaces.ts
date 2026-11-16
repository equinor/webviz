import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { corrCutOffAtom, numParamsAtom } from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    numParams: number;
    corrCutOff: number;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    numParams: (get) => get(numParamsAtom),
    corrCutOff: (get) => get(corrCutOffAtom),
};
