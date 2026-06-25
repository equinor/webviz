import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
    showDepthLineSettingAtom,
    visualizationSettingsAtom,
} from "./settings/atoms/derivedAtoms";
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
    wellName: (get) => get(selectedWellNameAtom),
    responseName: (get) => get(selectedResponseNameAtom),
    timestampUtcMs: (get) => get(selectedTimestampUtcMsAtom),
    visualizationSettings: (get) => get(visualizationSettingsAtom),
    showDepthLine: (get) => get(showDepthLineSettingAtom),
    dataAccessor: (get) => get(rftRealizationDataQueriesAtom).dataAccessor,
    observationsData: (get) => get(rftObservationsQueriesAtom).observationsData,
    isFetching: (get) => get(rftRealizationDataQueriesAtom).isFetching,
};
