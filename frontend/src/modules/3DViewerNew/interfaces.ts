import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { providerManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import { PreferredViewLayout } from "./types";

import { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { selectedFieldIdentifierAtom } from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    layerManager: DataProviderManager | null;
    fieldIdentifier: string | null;
    preferredViewLayout: PreferredViewLayout;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    layerManager: (get) => {
        return get(providerManagerAtom);
    },
    fieldIdentifier: (get) => {
        return get(selectedFieldIdentifierAtom);
    },
    preferredViewLayout: (get) => {
        return get(preferredViewLayoutAtom);
    },
};
