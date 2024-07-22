import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { triggeredRefreshCounterAtom } from "./implementation";

export type SettingsToViewInterface = {
    triggeredRefreshCounter: number;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    triggeredRefreshCounter: (get) => get(triggeredRefreshCounterAtom),
};
