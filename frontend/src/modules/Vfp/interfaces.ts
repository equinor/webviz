import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { selectedPressureOptionAtom } from "./settings/atoms/baseAtoms";
import { vfpDataAccessorWithStatusAtom } from "./settings/atoms/derivedAtoms";
import {
    selectedAlqIndicesAtom,
    selectedColorByAtom,
    selectedGfrIndicesAtom,
    selectedThpIndicesAtom,
    selectedWfrIndicesAtom,
} from "./settings/atoms/persistableFixableAtoms";
import type { PressureOption, VfpDataAccessorWithStatus, VfpParam } from "./types";

type SettingsToViewInterface = {
    vfpDataAccessorWithStatus: VfpDataAccessorWithStatus;
    selectedThpIndices: number[] | null;
    selectedWfrIndices: number[] | null;
    selectedGfrIndices: number[] | null;
    selectedAlqIndices: number[] | null;
    selectedColorBy: VfpParam;
    selectedPressureOption: PressureOption;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    vfpDataAccessorWithStatus: (get) => {
        return get(vfpDataAccessorWithStatusAtom);
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
    selectedColorBy: (get) => {
        return get(selectedColorByAtom).value;
    },
    selectedPressureOption: (get) => {
        return get(selectedPressureOptionAtom);
    },
};
