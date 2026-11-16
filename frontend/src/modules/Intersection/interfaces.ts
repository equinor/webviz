import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { ViewLayout } from "@modules/_shared/enums/viewLayout";

import { dataProviderManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    dataProviderManager: DataProviderManager | null;
    preferredViewLayout: ViewLayout;
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
