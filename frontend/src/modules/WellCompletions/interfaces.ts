import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { PlotData } from "@webviz/well-completions-plot";

import { availableTimeStepsAtom, dataLoadingStatusAtom, plotDataAtom } from "./settings/atoms/baseAtoms";
import { DataLoadingStatus } from "./typesAndEnums";

type SettingsToViewInterface = {
    dataLoadingStatus: DataLoadingStatus;
    plotData: PlotData | null;
    availableTimeSteps: string[] | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    dataLoadingStatus: (get) => {
        return get(dataLoadingStatusAtom);
    },
    plotData: (get) => {
        return get(plotDataAtom);
    },
    availableTimeSteps: (get) => {
        return get(availableTimeStepsAtom);
    },
};
