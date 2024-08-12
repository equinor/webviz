import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { VfpProdTable } from "src/api/models/VfpProdTable";
import { VfpParam } from "./types";

import {
    selectedAlqIndicesAtom,
    selectedGfrIndicesAtom,
    selectedPressureOptionAtom,
    selectedThpIndicesAtom,
    selectedVfpTableNameAtom,
    selectedWfrIndicesAtom,
} from "./settings/atoms/derivedAtoms";
import { vfpTableQueryAtom } from "./settings/atoms/queryAtoms";
import { PressureOption } from "./types";
import { selectedColorByAtom } from "./settings/atoms/derivedAtoms";

export type State = Record<string, never>;

export type Interface = {
    vfpTableName: string | null;
    vfpTable: VfpProdTable | undefined;
    selectedThpIndices: number[] | null;
    selectedWfrIndices: number[] | null;
    selectedGfrIndices: number[] | null;
    selectedAlqIndices: number[] | null;
    selectedPressureOption: PressureOption;
    selectedColorBy: VfpParam;
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    vfpTableName: (get) => {
        return get(selectedVfpTableNameAtom);
    },
    vfpTable: (get) => {
        return get(vfpTableQueryAtom).data;
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
