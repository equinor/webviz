import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    responseChannelNameAtom,
    selectedSensitivityAtom,
    sensitivityNamesAtom,
    showLabelsAtom,
    showRealizationPointsAtom,
} from "./settings/atoms/baseAtoms";
import { DisplayComponentType, SelectedSensitivity } from "./typesAndEnums";

export type SettingsToViewInterface = {
    displayComponentType: DisplayComponentType;
    referenceSensitivityName: string | null;
    sensitivityNames: string[];
    selectedSensitivity: SelectedSensitivity | null;
    responseChannelName: string | null;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    displayComponentType: (get) => {
        return get(displayComponentTypeAtom);
    },
    referenceSensitivityName: (get) => {
        return get(referenceSensitivityNameAtom);
    },
    sensitivityNames: (get) => {
        return get(sensitivityNamesAtom);
    },
    selectedSensitivity: (get) => {
        return get(selectedSensitivityAtom);
    },
    responseChannelName: (get) => {
        return get(responseChannelNameAtom);
    },
    showLabels: (get) => {
        return get(showLabelsAtom);
    },
    hideZeroY: (get) => {
        return get(hideZeroYAtom);
    },
    showRealizationPoints: (get) => {
        return get(showRealizationPointsAtom);
    },
};
