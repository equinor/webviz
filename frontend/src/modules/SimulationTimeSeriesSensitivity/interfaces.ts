import { Frequency_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    realizationsToIncludeAtom,
    resamplingFrequencyAtom,
    selectedSensitivitiesAtom,
    showHistoricalAtom,
    showRealizationsAtom,
    showStatisticsAtom,
    vectorSpecAtom,
} from "./settings/atoms/baseAtoms";
import { VectorSpec } from "./typesAndEnums";

type SettingsToViewInterface = {
    vectorSpec: VectorSpec | null;
    resamplingFrequency: Frequency_api | null;
    selectedSensitivities: string[] | null;
    showStatistics: boolean;
    showRealizations: boolean;
    realizationsToInclude: number[] | null;
    showHistorical: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    vectorSpec: (get) => {
        return get(vectorSpecAtom);
    },
    resamplingFrequency: (get) => {
        return get(resamplingFrequencyAtom);
    },
    selectedSensitivities: (get) => {
        return get(selectedSensitivitiesAtom);
    },
    showStatistics: (get) => {
        return get(showStatisticsAtom);
    },
    showRealizations: (get) => {
        return get(showRealizationsAtom);
    },
    realizationsToInclude: (get) => {
        return get(realizationsToIncludeAtom);
    },
    showHistorical: (get) => {
        return get(showHistoricalAtom);
    },
};
