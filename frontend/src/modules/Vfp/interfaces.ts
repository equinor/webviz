import type { VfpInjTable_api, VfpProdTable_api } from "@api";
import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { UseQueryResult } from "@tanstack/react-query";

import {
    selectedAlqIndicesAtom,
    selectedColorByAtom,
    selectedGfrIndicesAtom,
    selectedPressureOptionAtom,
    selectedThpIndicesAtom,
    selectedWfrIndicesAtom,
} from "./settings/atoms/derivedAtoms";
import { vfpTableQueryAtom } from "./settings/atoms/queryAtoms";
import type { PressureOption, VfpParam } from "./types";

type SettingsToViewInterface = {
    vfpDataQuery: UseQueryResult<VfpProdTable_api | VfpInjTable_api, Error>;
    selectedThpIndices: number[] | null;
    selectedWfrIndices: number[] | null;
    selectedGfrIndices: number[] | null;
    selectedAlqIndices: number[] | null;
    selectedPressureOption: PressureOption;
    selectedColorBy: VfpParam;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    vfpDataQuery: (get) => {
        return get(vfpTableQueryAtom);
    },
    selectedThpIndices: (get) => {
        return get(selectedThpIndicesAtom);
    },
    selectedWfrIndices: (get) => {
        return get(selectedWfrIndicesAtom);
    },
    selectedGfrIndices: (get) => {
        return get(selectedGfrIndicesAtom);
    },
    selectedAlqIndices: (get) => {
        return get(selectedAlqIndicesAtom);
    },
    selectedPressureOption: (get) => {
        return get(selectedPressureOptionAtom);
    },
    selectedColorBy: (get) => {
        return get(selectedColorByAtom);
    },
};
