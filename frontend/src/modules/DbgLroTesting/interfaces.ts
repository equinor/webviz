import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { displayableDataAtom } from "./settings/atoms/baseAtoms";
import { DisplayableData } from "./types";

type SettingsToViewInterface = {
    displayableData: DisplayableData | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    displayableData: (get) => get(displayableDataAtom),
};
