import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    barSortOrderAtom,
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    responseChannelNameAtom,
    sensitivityNamesAtom,
    showLabelsAtom,
    showRealizationPointsAtom,
    xAxisBarScalingAtom,
} from "./settings/atoms/baseAtoms";
import type { BarSortOrder, DisplayComponentType, SelectedSensitivity, XAxisBarScaling } from "./typesAndEnums";
import { selectedSensitivityAtom as ViewSelectedSensitivityAtom } from "./view/atoms/baseAtoms";

type SettingsToViewInterface = {
    displayComponentType: DisplayComponentType;
    referenceSensitivityName: string | null;
    sensitivityNames: string[];
    responseChannelName: string | null;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
    barSortOrder: BarSortOrder;
    xAxisBarScaling: XAxisBarScaling;
};

export type ViewToSettingsInterface = {
    selectedSensitivity: SelectedSensitivity | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
    viewToSettings: ViewToSettingsInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    displayComponentType: (get) => {
        return get(displayComponentTypeAtom);
    },
    referenceSensitivityName: (get) => {
        return get(referenceSensitivityNameAtom);
    },
    sensitivityNames: (get) => {
        return get(sensitivityNamesAtom);
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
    barSortOrder: (get) => {
        return get(barSortOrderAtom);
    },
    xAxisBarScaling: (get) => {
        return get(xAxisBarScalingAtom);
    },
};

export const viewToSettingsInterfaceInitialization: InterfaceInitialization<ViewToSettingsInterface> = {
    selectedSensitivity: (get) => {
        return get(ViewSelectedSensitivityAtom);
    },
};
