import { Frequency_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    resamplingFrequencyAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
} from "./settings/atoms/baseAtoms";
import { selectedSensitivityNamesAtom, vectorSpecificationAtom } from "./settings/atoms/derivedAtoms";
import { VectorSpec } from "./typesAndEnums";

export type SettingsToViewInterface = {
    vectorSpecification: VectorSpec | null;
    resamplingFrequency: Frequency_api | null;
    selectedSensitivityNames: string[] | null;
    showStatistics: boolean;
    showRealizations: boolean;
    showHistorical: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    vectorSpecification: (get) => {
        return get(vectorSpecificationAtom);
    },
    resamplingFrequency: (get) => {
        return get(resamplingFrequencyAtom);
    },
    selectedSensitivityNames: (get) => {
        return get(selectedSensitivityNamesAtom);
    },
    showStatistics: (get) => {
        return get(showStatisticsAtom);
    },
    showRealizations: (get) => {
        return get(showRealizationsAtom);
    },
    showHistorical: (get) => {
        return get(showHistoricalAtom);
    },
};
