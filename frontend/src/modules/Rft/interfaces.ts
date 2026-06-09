import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import {
    rftDataAccessorStatusAtom,
    rftObservationsStatusAtom,
    selectedResponseNameAtom,
    selectedTimestampUtcMsAtom,
    selectedWellNameAtom,
    visualizationSettingsAtom,
} from "./settings/atoms/derivedAtoms";
import type { RftDataAccessorStatus, RftObservationsStatus, VisualizationSettings } from "./typesAndEnums";

type SettingsToViewInterface = {
    wellName: string | null;
    responseName: string | null;
    timestampUtcMs: number | null;
    visualizationSettings: VisualizationSettings;
    rftDataAccessorStatus: RftDataAccessorStatus;
    rftObservationsStatus: RftObservationsStatus;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    wellName: (get) => get(selectedWellNameAtom),
    responseName: (get) => get(selectedResponseNameAtom),
    timestampUtcMs: (get) => get(selectedTimestampUtcMsAtom),
    visualizationSettings: (get) => get(visualizationSettingsAtom),
    rftDataAccessorStatus: (get) => get(rftDataAccessorStatusAtom),
    rftObservationsStatus: (get) => get(rftObservationsStatusAtom),
};
