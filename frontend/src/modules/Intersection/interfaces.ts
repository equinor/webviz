import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { dataProviderManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import type { PreferredViewLayout } from "./typesAndEnums";

export type SettingsToViewInterface = {
    dataProviderManager: DataProviderManager | null;
    preferredViewLayout: PreferredViewLayout;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    dataProviderManager: (get) => {
        return get(dataProviderManagerAtom);
    },
    preferredViewLayout: (get) => {
        return get(preferredViewLayoutAtom);
    },
};
