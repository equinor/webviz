import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { LayerManager } from "./layers/LayerManager";
import { layerManagerAtom, preferredViewLayoutAtom } from "./settings/atoms/baseAtoms";
import { PreferredViewLayout } from "./types";

export type SettingsToViewInterface = {
    layerManager: LayerManager | null;
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
