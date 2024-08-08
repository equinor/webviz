import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { VfpProdTable } from "src/api/models/VfpProdTable";

import {
    selectedAlqIndicesAtom,
    selectedGfrIndicesAtom,
    selectedThpIndicesAtom,
    selectedVfpTableNameAtom,
    selectedWfrIndicesAtom,
} from "./settings/atoms/derivedAtoms";
import { vfpTableQueryAtom } from "./settings/atoms/queryAtoms";

export type State = Record<string, never>;

export type Interface = {
    vfpTableName: string | null;
    vfpTable: VfpProdTable | undefined;
    selectedThpIndices: number[] | null;
    selectedWfrIndices: number[] | null;
    selectedGfrIndices: number[] | null;
    selectedAlqIndices: number[] | null;
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
};
