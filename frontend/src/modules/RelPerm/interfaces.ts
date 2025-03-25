import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedColorByAtom,
    selectedGroupByAtom,
    selectedLineWidthAtom,
    selectedOpacityAtom,
} from "./settings/atoms/baseAtoms";
import { relPermSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import { RelPermSpec, VisualizationSettings } from "./typesAndEnums";

export type SettingsToViewInterface = {
    relPermSpecifications: RelPermSpec[];
    visualizationSettings: VisualizationSettings;
};
export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    relPermSpecifications: (get) => {
        return get(relPermSpecificationsAtom);
    },
    visualizationSettings: (get) => {
        return {
            colorBy: get(selectedColorByAtom),
            groupBy: get(selectedGroupByAtom),
            opacity: get(selectedOpacityAtom),
            lineWidth: get(selectedLineWidthAtom),
        };
    },
};
