import { corrCutOffAtom, numParamsAtom, showLabelsAtom } from "./settings/atoms/baseAtoms";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

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
