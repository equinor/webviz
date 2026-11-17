import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedCurveTypeAtom } from "./settings/atoms/baseAtoms";
import { relPermDataAccessorStatusAtom, visualizationSettingsAtom } from "./settings/atoms/derivedAtoms";
import {
    selectedCurveNamesAtom,
    selectedSaturationAxisNameAtom,
    selectedSatnumsAtom,
    selectedTableNameAtom,
} from "./settings/atoms/persistableFixableAtoms";
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
    tableName: (get) => get(selectedTableNameAtom).value,
    saturationAxisName: (get) => get(selectedSaturationAxisNameAtom).value,
    curveNames: (get) => get(selectedCurveNamesAtom).value,
    satnums: (get) => get(selectedSatnumsAtom).value,
    curveType: (get) => get(selectedCurveTypeAtom),
    visualizationSettings: (get) => get(visualizationSettingsAtom),
    relPermDataAccessorStatus: (get) => get(relPermDataAccessorStatusAtom),
};
