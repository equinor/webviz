import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { PreferredViewLayout } from "@modules/_shared/components/SubsurfaceViewer/typesAndEnums";

import type { DataProviderManager } from "../_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { dataProviderManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import { fieldIdentifierAtom } from "./settings/atoms/persistableFixableAtoms";

export type SettingsToViewInterface = {
    dataProviderManager: DataProviderManager | null;
    preferredViewLayout: PreferredViewLayout;
    fieldId: string | null;
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
    fieldId: (get) => {
        return get(fieldIdentifierAtom).value;
    },
};
