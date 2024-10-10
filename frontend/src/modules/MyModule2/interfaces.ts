import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { persistentTextSettingAtom, textAtom } from "./atoms";

type SettingsToViewInterface = {
    text: string;
    derivedText: string;
    persistentText: string;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    text: (get) => get(textAtom),
    persistentText: (get) => get(persistentTextSettingAtom),
    derivedText: (get) => get(textAtom).toUpperCase(),
};
