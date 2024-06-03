import { InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { colorByAtom, groupByAtom, plotTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedInplaceCategoriesAtom,
    selectedInplaceResponseAtom,
    selectedInplaceTableNameAtom,
} from "./settings/atoms/derivedAtoms";
import { PlotGroupingEnum, PlotTypeEnum } from "./typesAndEnums";

export type Interface = {
    baseStates: {};
    derivedStates: {
        plotType: PlotTypeEnum;
        colorBy: PlotGroupingEnum;
        groupBy: PlotGroupingEnum;
        selectedEnsembleIdents: EnsembleIdent[];
        selectedInplaceTableName: string | null;
        selectedInplaceResponseName: string | null;
        selectedInplaceCategories: InplaceVolumetricsIndex_api[];
    };
};

export const interfaceInitialization: InterfaceInitialization<Interface> = {
    baseStates: {},
    derivedStates: {
        plotType: (get) => {
            return get(plotTypeAtom);
        },
        colorBy: (get) => {
            return get(colorByAtom);
        },
        groupBy: (get) => {
            return get(groupByAtom);
        },
        selectedEnsembleIdents: (get) => {
            return get(selectedEnsembleIdentsAtom);
        },
        selectedInplaceTableName: (get) => {
            return get(selectedInplaceTableNameAtom);
        },
        selectedInplaceResponseName: (get) => {
            return get(selectedInplaceResponseAtom);
        },
        selectedInplaceCategories: (get) => {
            return get(selectedInplaceCategoriesAtom);
        },
    },
};
