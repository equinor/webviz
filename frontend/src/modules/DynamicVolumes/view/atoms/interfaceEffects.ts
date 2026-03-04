import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/DynamicVolumes/interfaces";

import {
    colorByAtom,
    ensembleIdentsAtom,
    fipRegionLabelsAtom,
    resampleFrequencyAtom,
    selectedRegionsAtom,
    subplotByAtom,
    vectorNamesToFetchAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const colorBy = getInterfaceValue("colorBy");
        setAtomValue(colorByAtom, colorBy);
    },
    (getInterfaceValue, setAtomValue) => {
        const subplotBy = getInterfaceValue("subplotBy");
        setAtomValue(subplotByAtom, subplotBy);
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
        const fipRegionLabels = getInterfaceValue("fipRegionLabels");
        setAtomValue(fipRegionLabelsAtom, fipRegionLabels);
    },
];
