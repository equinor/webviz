import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedCurveTypeAtom } from "./settings/atoms/baseAtoms";
import {
    relPermDataAccessorStatusAtom,
    selectedCurveNamesAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
    visualizationSettingsAtom,
} from "./settings/atoms/derivedAtoms";
import type { CurveType, RelPermDataAccessorStatus, VisualizationSettings } from "./typesAndEnums";

type SettingsToViewInterface = {
    tableName: string | null;
    saturationAxisName: string | null;
    curveNames: string[];
    satnums: number[];
    curveType: CurveType;
    visualizationSettings: VisualizationSettings;
    relPermDataAccessorStatus: RelPermDataAccessorStatus;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    tableName: (get) => get(selectedTableNameAtom),
    saturationAxisName: (get) => get(selectedSaturationAxisNameAtom),
    curveNames: (get) => get(selectedCurveNamesAtom),
    satnums: (get) => get(selectedSatnumsAtom),
    curveType: (get) => get(selectedCurveTypeAtom),
    visualizationSettings: (get) => get(visualizationSettingsAtom),
    relPermDataAccessorStatus: (get) => get(relPermDataAccessorStatusAtom),
};
