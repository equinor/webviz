import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { parameterIdentStringsAtom, showLabelsAtom } from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    parameterIdentStrings: string[];
    showLabels: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    parameterIdentStrings: (get) => get(parameterIdentStringsAtom),
    showLabels: (get) => get(showLabelsAtom),
};
