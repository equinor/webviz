import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { viewInputDataAtom } from "./settings/atoms";
import { viewDisplayableDataAtom } from "./settings/atoms";
import { ViewDisplayableData } from "./types";
import { ViewInputData } from "./types";

type SettingsToViewInterface = {
    displayableData: ViewDisplayableData | null;
    viewInputData: ViewInputData | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    displayableData: (get) => get(viewDisplayableDataAtom),
    viewInputData: (get) => get(viewInputDataAtom),
};
