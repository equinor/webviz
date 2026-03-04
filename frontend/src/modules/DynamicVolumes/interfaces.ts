import type { Frequency_api } from "@api";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    resampleFrequencyAtom,
    selectedStatisticsAtom,
    showRecoveryFactorAtom,
    visualizationModeAtom,
    colorByAtom,
    subplotByAtom,
    regionSelectionModeAtom,
} from "./settings/atoms/baseAtoms";
import {
    effectiveSelectedRegionsAtom,
    fipRegionLabelsAtom,
    selectedVectorNamesToFetchAtom,
} from "./settings/atoms/derivedAtoms";
import { selectedEnsembleIdentsAtom, selectedVectorBaseNameAtom } from "./settings/atoms/persistableFixableAtoms";
import type { PlotDimension, RegionSelectionMode, StatisticsType, VisualizationMode } from "./typesAndEnums";

export type SettingsToViewInterface = {
    visualizationMode: VisualizationMode;
    colorBy: PlotDimension;
    subplotBy: PlotDimension | null;
    regionSelectionMode: RegionSelectionMode;
    selectedStatistics: StatisticsType[];
    resampleFrequency: Frequency_api;
    ensembleIdents: RegularEnsembleIdent[];
    vectorNamesToFetch: string[];
    selectedRegions: number[];
    selectedVectorBaseName: string | null;
    fipRegionLabels: Record<number, { zone: string; region: string }>;
    showRecoveryFactor: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    visualizationMode: (get) => get(visualizationModeAtom),
    colorBy: (get) => get(colorByAtom),
    subplotBy: (get) => get(subplotByAtom),
    regionSelectionMode: (get) => get(regionSelectionModeAtom),
    selectedStatistics: (get) => get(selectedStatisticsAtom),
    resampleFrequency: (get) => get(resampleFrequencyAtom),
    ensembleIdents: (get) => get(selectedEnsembleIdentsAtom).value ?? [],
    vectorNamesToFetch: (get) => get(selectedVectorNamesToFetchAtom),
    selectedRegions: (get) => get(effectiveSelectedRegionsAtom),
    selectedVectorBaseName: (get) => get(selectedVectorBaseNameAtom).value,
    fipRegionLabels: (get) => get(fipRegionLabelsAtom),
    showRecoveryFactor: (get) => get(showRecoveryFactorAtom),
};
