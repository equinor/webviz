import type { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    colorByAtom,
    resampleFrequencyAtom,
    selectedEnsembleIdentsAtom,
    selectedRegionsAtom,
    selectedStatisticsAtom,
    selectedVectorBaseNameAtom,
    showHistogramAtom,
    visualizationModeAtom,
} from "./settings/atoms/baseAtoms";
import { selectedVectorNamesToFetchAtom } from "./settings/atoms/derivedAtoms";
import type { ColorBy, StatisticsType, VisualizationMode } from "./typesAndEnums";

export type SettingsToViewInterface = {
    visualizationMode: VisualizationMode;
    colorBy: ColorBy;
    selectedStatistics: StatisticsType[];
    showHistogram: boolean;
    resampleFrequency: Frequency_api;
    ensembleIdents: RegularEnsembleIdent[];
    vectorNamesToFetch: string[];
    selectedRegions: number[];
    selectedVectorBaseName: string | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    visualizationMode: (get) => get(visualizationModeAtom),
    colorBy: (get) => get(colorByAtom),
    selectedStatistics: (get) => get(selectedStatisticsAtom),
    showHistogram: (get) => get(showHistogramAtom),
    resampleFrequency: (get) => get(resampleFrequencyAtom),
    ensembleIdents: (get) => get(selectedEnsembleIdentsAtom).value ?? [],
    vectorNamesToFetch: (get) => get(selectedVectorNamesToFetchAtom),
    selectedRegions: (get) => get(selectedRegionsAtom),
    selectedVectorBaseName: (get) => get(selectedVectorBaseNameAtom),
};
