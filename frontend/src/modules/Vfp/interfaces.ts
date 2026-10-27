import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedPressureOptionAtom } from "./settings/atoms/baseAtoms";
import { isParameterSelectionValidAtom, tableDataAccessorWithStatusFlagsAtom } from "./settings/atoms/derivedAtoms";
import {
    selectedAlqIndicesAtom,
    selectedColorByAtom,
    selectedGfrIndicesAtom,
    selectedThpIndicesAtom,
    selectedWfrIndicesAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { PressureOption, TableDataAccessorWithStatusFlags, VfpParam } from "./types";

type SettingsToViewInterface = {
    tableDataAccessorWithStatusFlags: TableDataAccessorWithStatusFlags;
    selectedThpIndices: number[] | null;
    selectedWfrIndices: number[] | null;
    selectedGfrIndices: number[] | null;
    selectedAlqIndices: number[] | null;
    isParameterSelectionValid: boolean;
    selectedColorBy: VfpParam;
    selectedPressureOption: PressureOption;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    tableDataAccessorWithStatusFlags: (get) => {
        return get(tableDataAccessorWithStatusFlagsAtom);
    },
    selectedThpIndices: (get) => {
        return get(selectedThpIndicesAtom).value;
    },
    selectedWfrIndices: (get) => {
        return get(selectedWfrIndicesAtom).value;
    },
    selectedGfrIndices: (get) => {
        return get(selectedGfrIndicesAtom).value;
    },
    selectedAlqIndices: (get) => {
        return get(selectedAlqIndicesAtom).value;
    },
    isParameterSelectionValid: (get) => {
        return get(isParameterSelectionValidAtom);
    },
    selectedColorBy: (get) => {
        return get(selectedColorByAtom).value;
    },
    selectedPressureOption: (get) => {
        return get(selectedPressureOptionAtom);
    },
};
