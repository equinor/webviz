import { FluidZone_api, InplaceVolumetricsIndex_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { FluidZoneTypeEnum } from "@modules/_shared/InplaceVolumetrics/types";

import { colorByAtom, groupByAtom, plotTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedInplaceFluidZonesAtom,
    selectedInplaceIndexesAtom,
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
        selectedInplaceFluidZones: FluidZone_api[];
        selectedInplaceResponseName: string | null;
        selectedInplaceIndexes: {
            index_name: string;
            values: (string | number)[];
        }[];
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
        selectedInplaceFluidZones: (get) => {
            return get(selectedInplaceFluidZonesAtom);
        },
        selectedInplaceResponseName: (get) => {
            return get(selectedInplaceResponseAtom);
        },
        selectedInplaceIndexes: (get) => {
            return get(selectedInplaceIndexesAtom);
        },
    },
};
