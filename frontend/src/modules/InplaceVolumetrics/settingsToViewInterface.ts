import { InplaceVolumetricsCategoryValues_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { colorByAtom, groupByAtom } from "./settings/atoms/baseAtoms";
import { selectedEnsembleIdentsAtom, selectedInplaceCategoriesAtom } from "./settings/atoms/derivedAtoms";
import { inplaceTableDataSetQueryAtom } from "./settings/atoms/queryAtoms";
import { CombinedInplaceDataResults, PlotGroupingEnum } from "./typesAndEnums";

export type Interface = {
    baseStates: {};
    derivedStates: {
        colorBy: PlotGroupingEnum;
        groupBy: PlotGroupingEnum;
        inplaceTableDataSetQuery: CombinedInplaceDataResults;
        selectedEnsembleIdents: EnsembleIdent[];
        selectedInplaceCategories: InplaceVolumetricsCategoryValues_api[];
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
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedInplaceCategories: (get) => {
            return get(selectedInplaceCategoriesAtom);
        },
    },
};
