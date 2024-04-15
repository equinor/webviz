import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { colorByAtom, groupByAtom } from "./settings/atoms/baseAtoms";
import { inplaceTableDataSetQueryAtom } from "./settings/atoms/queryAtoms";
import { CombinedInplaceDataResults } from "./typesAndEnums";

export type Interface = {
    baseStates: {};
    derivedStates: {
        colorBy: string;
        groupBy: string;
        inplaceTableDataSetQuery: CombinedInplaceDataResults;
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {},
    derivedStates: {
        colorBy: (get) => {
            return get(colorByAtom);
        },
        groupBy: (get) => {
            return get(groupByAtom);
        },
        inplaceTableDataSetQuery: (get) => {
            return get(inplaceTableDataSetQueryAtom);
        },
    },
};
