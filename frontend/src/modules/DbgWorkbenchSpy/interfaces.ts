import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { triggeredRefreshCounterAtom } from "./implementation";

type SettingsToViewInterface = {
    triggeredRefreshCounter: number;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    triggeredRefreshCounter: (get) => get(triggeredRefreshCounterAtom),
};
