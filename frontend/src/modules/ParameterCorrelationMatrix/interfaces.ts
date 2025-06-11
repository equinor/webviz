import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { parameterIdentStringsAtom } from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    parameterIdentStrings: string[];
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    parameterIdentStrings: (get) => get(parameterIdentStringsAtom),
};
