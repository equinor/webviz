import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { layerManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import type { PreferredViewLayout } from "./types";

import type { DataLayerManager } from "../_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";

export type SettingsToViewInterface = {
    layerManager: DataLayerManager | null;
    preferredViewLayout: PreferredViewLayout;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    layerManager: (get) => {
        return get(layerManagerAtom);
    },
    preferredViewLayout: (get) => {
        return get(preferredViewLayoutAtom);
    },
};
