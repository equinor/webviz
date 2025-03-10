import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/SimulationTimeSeriesSensitivity/interfaces";

import {
    resamplingFrequencyAtom,
    selectedSensitivityNamesAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    vectorSpecificationAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const vectorSpecification = getInterfaceValue("vectorSpecification");
        setAtomValue(vectorSpecificationAtom, vectorSpecification);
    },
    (getInterfaceValue, setAtomValue) => {
        const resamplingFrequency = getInterfaceValue("resamplingFrequency");
        setAtomValue(resamplingFrequencyAtom, resamplingFrequency);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectedSensitivityNames = getInterfaceValue("selectedSensitivityNames");
        setAtomValue(selectedSensitivityNamesAtom, selectedSensitivityNames);
    },
    (getInterfaceValue, setAtomValue) => {
        const showStatistics = getInterfaceValue("showStatistics");
        setAtomValue(showStatisticsAtom, showStatistics);
    },
    (getInterfaceValue, setAtomValue) => {
        const showRealizations = getInterfaceValue("showRealizations");
        setAtomValue(showRealizationsAtom, showRealizations);
    },
    (getInterfaceValue, setAtomValue) => {
        const showHistorical = getInterfaceValue("showHistorical");
        setAtomValue(showHistoricalAtom, showHistorical);
    },
];
