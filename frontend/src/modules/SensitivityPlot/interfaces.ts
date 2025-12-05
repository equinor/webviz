import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type { SensitivitySortBy } from "../_shared/SensitivityProcessing/types";

import {
    sensitivitySortByAtom,
    colorByAtom,
    displayComponentTypeAtom,
    hideZeroYAtom,
    referenceSensitivityNameAtom,
    responseChannelNameAtom,
    showLabelsAtom,
    showRealizationPointsAtom,
    sensitivityScalingAtom,
} from "./settings/atoms/baseAtoms";
import type { DisplayComponentType, SensitivityScaling } from "./typesAndEnums";
import type { ColorBy } from "./view/components/sensitivityChartFigure";

type SettingsToViewInterface = {
    displayComponentType: DisplayComponentType;
    referenceSensitivityName: string | null;
    responseChannelName: string | null;
    showLabels: boolean;
    hideZeroY: boolean;
    showRealizationPoints: boolean;
    sensitivitySortBy: SensitivitySortBy;
    sensitivityScaling: SensitivityScaling;
    colorBy: ColorBy;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    displayComponentType: (get) => {
        return get(displayComponentTypeAtom);
    },
    referenceSensitivityName: (get) => {
        return get(referenceSensitivityNameAtom);
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
    sensitivitySortBy: (get) => {
        return get(sensitivitySortByAtom);
    },
    sensitivityScaling: (get) => {
        return get(sensitivityScalingAtom);
    },
    colorBy: (get) => {
        return get(colorByAtom);
    },
};
