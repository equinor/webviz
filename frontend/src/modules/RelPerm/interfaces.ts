import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedColorByAtom } from "./settings/atoms/baseAtoms";
import { selectedVisualizationTypeAtom } from "./settings/atoms/baseAtoms";
import { relPermSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import { ColorBy, RelPermSpec, VisualizationType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    relPermSpecifications: RelPermSpec[];
    colorBy: ColorBy;
    visualizationType: VisualizationType;
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
    visualizationType: (get) => {
        return get(selectedVisualizationTypeAtom);
    },
};
