import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type { DataProviderManager } from "../_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { dataProviderManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import { fieldIdentifierAtom } from "./settings/atoms/persistableFixableAtoms";
import type { PreferredViewLayout } from "./types";

export type SettingsToViewInterface = {
    fieldId: string | null;
    layerManager: DataProviderManager | null;
    preferredViewLayout: PreferredViewLayout;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    fieldId: (get) => {
        return get(fieldIdentifierAtom).value;
    },
    layerManager: (get) => {
        return get(dataProviderManagerAtom);
    },
    preferredViewLayout: (get) => {
        return get(preferredViewLayoutAtom);
    },
};
