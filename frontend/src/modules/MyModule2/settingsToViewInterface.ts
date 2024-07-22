import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { textAtom } from "./atoms";

export type SettingsToViewInterface = {
    text: string;
    derivedText: string;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    text: (get) => get(textAtom),
    derivedText: (get) => get(textAtom).toUpperCase(),
};
