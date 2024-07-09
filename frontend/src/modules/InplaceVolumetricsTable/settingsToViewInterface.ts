import { InplaceVolumetricResultName_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";

import { calcMeanAcrossAllRealizationsAtom } from "./settings/atoms/baseAtoms";
import {
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNamesAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import { SubplotBy, SubplotByInfo } from "./typesAndEnums";

export type SettingsToViewInterface = {
    derivedStates: {
        filter: InplaceVolumetricsFilter;
        resultNames: InplaceVolumetricResultName_api[];
        subplotBy: SubplotByInfo;
        accumulationOptions: string[];
        calcMeanAcrossAllRealizations: boolean;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    derivedStates: {
        filter: (get) => {
            return {
                ensembleIdents: get(selectedEnsembleIdentsAtom),
                tableNames: get(selectedTableNamesAtom),
                fluidZones: get(selectedFluidZonesAtom),
                identifiersValues: get(selectedIdentifiersValuesAtom),
            };
        },
        resultNames: (get) => get(selectedResultNamesAtom),
        subplotBy: () => {
            return {
                subplotBy: SubplotBy.SOURCE,
            };
        },
        accumulationOptions: (get) => get(selectedAccumulationOptionsAtom),
        calcMeanAcrossAllRealizations: (get) => get(calcMeanAcrossAllRealizationsAtom),
    },
};
