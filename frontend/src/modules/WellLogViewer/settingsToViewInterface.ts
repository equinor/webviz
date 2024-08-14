import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { WellboreHeader } from "src/api/models/WellboreHeader";

import { userSelectedWellLogCurveNamesAtom } from "./settings/atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedLogNameAtom, selectedWellboreAtom } from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    selectedField: string | null;
    wellboreHeader: WellboreHeader | null;
    curveNames: string[];
    selectedLog: string | null;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    selectedField: (get) => get(selectedFieldIdentifierAtom),
    wellboreHeader: (get) => get(selectedWellboreAtom),
    curveNames: (get) => get(userSelectedWellLogCurveNamesAtom),
    selectedLog: (get) => get(selectedLogNameAtom),
};
