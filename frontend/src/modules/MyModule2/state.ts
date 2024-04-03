import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { textAtom } from "./atoms";

export type State = {
    text: string;
};

export const defaultState: State = {
    text: "Hello World",
};

// ------------------------------------------------

export type Interface = {
    baseStates: {
        text: string;
    };
    derivedStates: {
        derivedText: string;
    };
};

export const interfaceDefinition: InterfaceInitialization<Interface> = {
    baseStates: {
        text: "Hello World",
    },
    derivedStates: {
        derivedText: (get) => get(textAtom).toUpperCase(),
    },
};
