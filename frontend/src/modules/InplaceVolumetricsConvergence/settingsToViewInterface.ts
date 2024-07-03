import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";

import {
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIndexFilterValuesAtom,
    selectedResultNameAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import { SubplotBy, SubplotByInfo } from "./typesAndEnums";

export type SettingsToViewInterface = {
    derivedStates: {
        filter: InplaceVolumetricsFilter;
        resultName: string | null;
        subplotBy: SubplotByInfo;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    derivedStates: {
        filter: (get) => {
            return {
                ensembleIdents: get(selectedEnsembleIdentsAtom),
                tableNames: get(selectedTableNamesAtom),
                fluidZones: get(selectedFluidZonesAtom),
                indexFilters: get(selectedIndexFilterValuesAtom),
            };
        },
        resultName: (get) => get(selectedResultNameAtom),
        subplotBy: () => {
            return {
                subplotBy: SubplotBy.SOURCE,
            };
        },
    },
};
