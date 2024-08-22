import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { textAtom } from "./atoms";

type SettingsToViewInterface = {
    text: string;
    derivedText: string;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    text: (get) => get(textAtom),
    derivedText: (get) => get(textAtom).toUpperCase(),
};
