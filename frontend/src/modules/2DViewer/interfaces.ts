import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { layerManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import { PreferredViewLayout } from "./types";

import { DataLayerManager } from "../_shared/LayerFramework/framework/LayerManager/DataLayerManager";

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
