import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { VfpParam,} from "./types";

import {
    selectedAlqIndicesAtom,
    selectedGfrIndicesAtom,
    selectedPressureOptionAtom,
    selectedThpIndicesAtom,
    selectedWfrIndicesAtom,
} from "./settings/atoms/derivedAtoms";
import { vfpTableQueryAtom } from "./settings/atoms/queryAtoms";
import { PressureOption } from "./types";
import { selectedColorByAtom } from "./settings/atoms/derivedAtoms";
import { UseQueryResult } from "@tanstack/react-query";
import { VfpProdTable_api } from "@api";

type SettingsToViewInterface = {
    vfpDataQuery: UseQueryResult<VfpProdTable_api, Error>;
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
