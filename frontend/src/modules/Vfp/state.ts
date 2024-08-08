import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { 
    vfpTableDataAtom, 
    selectedVfpTableNameAtom,
    selectedThpIndicesAtom,
    selectedWfrIndicesAtom,
    selectedGfrIndicesAtom,
    selectedAlqIndicesAtom,
} from "./settings/atoms/derivedAtoms";
import { VfpProdTable } from "src/api/models/VfpProdTable";

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
        return get(vfpTableDataAtom);
    },
    selectedThpIndices: (get) => {
        return get(selectedThpIndicesAtom)
    },
    selectedWfrIndices: (get) => {
        return get(selectedWfrIndicesAtom)
    },
    selectedGfrIndices: (get) => {
        return get(selectedGfrIndicesAtom)
    },
    selectedAlqIndices: (get) => {
        return get(selectedAlqIndicesAtom)
    },
};
