import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { PlotData } from "@webviz/well-completions-plot";

import { dataLoadingStatusAtom, plotDataAtom, sortedCompletionDatesAtom } from "./settings/atoms/derivedAtoms";
import { DataLoadingStatus } from "./typesAndEnums";

type SettingsToViewInterface = {
    dataLoadingStatus: DataLoadingStatus;
    plotData: PlotData | null;
    sortedCompletionDates: string[] | null;
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
    sortedCompletionDates: (get) => {
        return get(sortedCompletionDatesAtom);
    },
};
