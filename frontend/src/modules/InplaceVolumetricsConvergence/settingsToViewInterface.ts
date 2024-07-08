import { InplaceVolumetricResultName_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";

import { InplaceVolumetricsIdentifier } from "src/api/models/InplaceVolumetricsIdentifier";

import {
    selectedAccumulationOptionsAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNameAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import { SubplotBy, SubplotByInfo } from "./typesAndEnums";

export type SettingsToViewInterface = {
    derivedStates: {
        filter: InplaceVolumetricsFilter;
        resultName: InplaceVolumetricResultName_api | null;
        subplotBy: SubplotByInfo;
        accumulationOptions: string[];
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
        resultName: (get) => get(selectedResultNameAtom),
        subplotBy: () => {
            return {
                subplotBy: SubplotBy.SOURCE,
            };
        },
        accumulationOptions: (get) => get(selectedAccumulationOptionsAtom),
    },
};
