import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedColorByAtom,
    selectedCurveTypeAtom,
    selectedGroupByAtom,

} from "./settings/atoms/baseAtoms";
import { relPermSpecificationsAtom } from "./settings/atoms/derivedAtoms";
import type { CurveType, RelPermSpec, VisualizationSettings, VisualizationType } from "./typesAndEnums";
import { visualizationTypeAtom } from "./view/atoms/baseAtoms";

export type SettingsToViewInterface = {
    relPermSpecifications: RelPermSpec[];
    visualizationSettings: VisualizationSettings;
    curveType: CurveType;
    visualizationType: VisualizationType;
};
export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    relPermSpecifications: (get) => {
        return get(relPermSpecificationsAtom);
    },
    visualizationType: (get) => {
        return get(visualizationTypeAtom);
    },
    visualizationSettings: (get) => {
        return {
            colorBy: get(selectedColorByAtom),
            groupBy: get(selectedGroupByAtom),

        };
    },
    curveType: (get) => {
        return get(selectedCurveTypeAtom);
    },
};
