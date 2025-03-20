import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedColorByAtom } from "./settings/atoms/baseAtoms";
import { selectedVisualizationModeAtom } from "./settings/atoms/baseAtoms";
import { relPermSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import { ColorBy, RelPermSpec, VisualizationMode } from "./typesAndEnums";

export type SettingsToViewInterface = {
    relPermSpecifications: RelPermSpec[];
    colorBy: ColorBy;
    visualizationMode: VisualizationMode;
};
export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    relPermSpecifications: (get) => {
        return get(relPermSpecificationsAtom);
    },
    colorBy: (get) => {
        return get(selectedColorByAtom);
    },
    visualizationMode: (get) => {
        return get(selectedVisualizationModeAtom);
    },
};
