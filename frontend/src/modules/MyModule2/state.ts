import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { textAtom } from "./atoms";

export type State = {
    text: string;
};

export const defaultState: State = {
    text: "Hello World",
};

// ------------------------------------------------

export type SettingsToViewInterface = {
    text: string;
    derivedText: string;
};

export const interfaceDefinition: InterfaceInitialization<SettingsToViewInterface> = {
    text: (get) => get(textAtom),
    derivedText: (get) => get(textAtom).toUpperCase(),
};
