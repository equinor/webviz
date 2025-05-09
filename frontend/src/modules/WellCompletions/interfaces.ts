import type { PlotData } from "@webviz/well-completions-plot";

import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { dataLoadingStatusAtom, plotDataAtom, sortedCompletionDatesAtom } from "./settings/atoms/derivedAtoms";
import type { DataLoadingStatus } from "./typesAndEnums";

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
