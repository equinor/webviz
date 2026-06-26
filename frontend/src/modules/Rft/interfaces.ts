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
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
} from "./settings/atoms/persistableFixableAtoms";
import { rftObservationsQueriesAtom, rftRealizationDataQueriesAtom } from "./settings/atoms/queryAtoms";
import type { RftDataAccessorLike, RftEnsembleObservationsData, VisualizationSettings } from "./typesAndEnums";

type SettingsToViewInterface = {
    wellName: string | null;
    responseName: string | null;
    timestampUtcMs: number | null;
    visualizationSettings: VisualizationSettings;
    showDepthLine: boolean;
    dataAccessor: RftDataAccessorLike | null;
    observationsData: RftEnsembleObservationsData[];
    isFetching: boolean;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    wellName: (get) => get(selectedWellNameAtom).value,
    responseName: (get) => get(selectedResponseNameAtom).value,
    timestampUtcMs: (get) => get(selectedTimestampUtcMsAtom).value,
    visualizationSettings: (get) => ({
        showIndividualRealizations: get(showIndividualRealizationsAtom),
        showStatisticalLines: get(showStatisticalLinesAtom),
        showStatisticalFan: get(showStatisticalFanAtom),
        showObservations: get(showObservationsAtom),
        selectedStatistics: get(selectedStatisticsAtom),
    }),
    showDepthLine: (get) => get(showDepthLineAtom),
    dataAccessor: (get) => get(rftRealizationDataQueriesAtom).dataAccessor,
    observationsData: (get) => get(rftObservationsQueriesAtom).observationsData,
    isFetching: (get) => get(rftRealizationDataQueriesAtom).isFetching,
};
