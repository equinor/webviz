import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedStatisticsAtom,
    showDepthLineAtom,
    showIndividualRealizationsAtom,
    showObservationsAtom,
    showStatisticalFanAtom,
    showStatisticalLinesAtom,
} from "./settings/atoms/baseAtoms";
import {
    effectiveTimestampUtcMsAtom,
    highlightedRealizationAtom,
} from "./settings/atoms/dashboardSettingAtoms";
import { validRealizationNumbersAtom } from "./settings/atoms/derivedAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedResponseNameAtom,
    selectedWellNameAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { TimestampInfoForView, VisualizationSettings } from "./typesAndEnums";

export type SettingsToViewInterface = {
    ensembleIdents: RegularEnsembleIdent[];
    isEnsembleSelectionValid: boolean;
    wellName: string | null;
    isWellNameValid: boolean;
    responseName: string | null;
    isResponseNameValid: boolean;
    timestamp: TimestampInfoForView;
    validRealizationNumbers: number[];
    highlightedRealization: number | null;
    visualizationSettings: VisualizationSettings;
    showDepthLine: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    ensembleIdents: (get) => get(selectedEnsembleIdentsAtom).value,
    isEnsembleSelectionValid: (get) => get(selectedEnsembleIdentsAtom).isValidInContext,
    wellName: (get) => get(selectedWellNameAtom).value,
    isWellNameValid: (get) => get(selectedWellNameAtom).isValidInContext,
    responseName: (get) => get(selectedResponseNameAtom).value,
    isResponseNameValid: (get) => get(selectedResponseNameAtom).isValidInContext,
    timestamp: (get) => {
        const { value, isValidInContext } = get(effectiveTimestampUtcMsAtom);
        return { value, isValidInContext };
    },
    validRealizationNumbers: (get) => get(validRealizationNumbersAtom),
    highlightedRealization: (get) => get(highlightedRealizationAtom),
    visualizationSettings: (get) => ({
        showIndividualRealizations: get(showIndividualRealizationsAtom),
        showStatisticalLines: get(showStatisticalLinesAtom),
        showStatisticalFan: get(showStatisticalFanAtom),
        showObservations: get(showObservationsAtom),
        selectedStatistics: get(selectedStatisticsAtom),
    }),
    showDepthLine: (get) => get(showDepthLineAtom),
};
