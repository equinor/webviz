import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { vfpTableDataAtom, selectedVfpTableNameAtom } from "./settings/atoms/derivedAtoms";
import { VfpTable } from "src/api/models/VfpTable";

export type State = Record<string, never>;

export type Interface = {
    baseStates: Record<string, never>;
    derivedStates: {
        vfpTableName: string | null;
        vfpTable: VfpTable | undefined;
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {},
    derivedStates: {
        vfpTableName: (get) => {
            return get(selectedVfpTableNameAtom);
        },
        vfpTable: (get) => {
            return get(vfpTableDataAtom);
        },
    },
};
