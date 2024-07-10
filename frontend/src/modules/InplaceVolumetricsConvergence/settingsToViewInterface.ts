import { InplaceVolumetricResultName_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";

import { userSelectedSubplotByAtom } from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNameAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import { SubplotByInfo } from "./typesAndEnums";

export type SettingsToViewInterface = {
    derivedStates: {
        filter: InplaceVolumetricsFilter;
        resultName: InplaceVolumetricResultName_api | null;
        subplotBy: SubplotByInfo | null;
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
        subplotBy: (get) => get(userSelectedSubplotByAtom),
    },
};
