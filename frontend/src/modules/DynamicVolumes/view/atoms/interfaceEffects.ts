import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/DynamicVolumes/interfaces";

import {
    colorByAtom,
    ensembleIdentsAtom,
    fipRegionLabelsAtom,
    regionSelectionModeAtom,
    resampleFrequencyAtom,
    selectedRegionsAtom,
    selectedStatisticsAtom,
    selectedVectorBaseNameAtom,
    showRecoveryFactorAtom,
    subplotByAtom,
    vectorNamesToFetchAtom,
    visualizationModeAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const visualizationMode = getInterfaceValue("visualizationMode");
        setAtomValue(visualizationModeAtom, visualizationMode);
    },
    (getInterfaceValue, setAtomValue) => {
        const colorBy = getInterfaceValue("colorBy");
        setAtomValue(colorByAtom, colorBy);
    },
    (getInterfaceValue, setAtomValue) => {
        const subplotBy = getInterfaceValue("subplotBy");
        setAtomValue(subplotByAtom, subplotBy);
    },
    (getInterfaceValue, setAtomValue) => {
        const regionSelectionMode = getInterfaceValue("regionSelectionMode");
        setAtomValue(regionSelectionModeAtom, regionSelectionMode);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectedStatistics = getInterfaceValue("selectedStatistics");
        setAtomValue(selectedStatisticsAtom, selectedStatistics);
    },
    (getInterfaceValue, setAtomValue) => {
        const resampleFrequency = getInterfaceValue("resampleFrequency");
        setAtomValue(resampleFrequencyAtom, resampleFrequency);
    },
    (getInterfaceValue, setAtomValue) => {
        const ensembleIdents = getInterfaceValue("ensembleIdents");
        setAtomValue(ensembleIdentsAtom, ensembleIdents);
    },
    (getInterfaceValue, setAtomValue) => {
        const vectorNamesToFetch = getInterfaceValue("vectorNamesToFetch");
        setAtomValue(vectorNamesToFetchAtom, vectorNamesToFetch);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectedRegions = getInterfaceValue("selectedRegions");
        setAtomValue(selectedRegionsAtom, selectedRegions);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectedVectorBaseName = getInterfaceValue("selectedVectorBaseName");
        setAtomValue(selectedVectorBaseNameAtom, selectedVectorBaseName);
    },
    (getInterfaceValue, setAtomValue) => {
        const fipRegionLabels = getInterfaceValue("fipRegionLabels");
        setAtomValue(fipRegionLabelsAtom, fipRegionLabels);
    },
    (getInterfaceValue, setAtomValue) => {
        const showRecoveryFactor = getInterfaceValue("showRecoveryFactor");
        setAtomValue(showRecoveryFactorAtom, showRecoveryFactor);
    },
];
