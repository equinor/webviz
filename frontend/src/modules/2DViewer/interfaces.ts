import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { LayerManager } from "./layers/LayerManager";
import { layerManagerAtom } from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    layerManager: LayerManager | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    layerManager: (get) => {
        return get(layerManagerAtom);
    },
};
