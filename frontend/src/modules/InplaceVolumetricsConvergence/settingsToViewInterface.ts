import { InplaceVolumetricResultName_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { InplaceVolumetricsFilter } from "@framework/types/inplaceVolumetricsFilter";
import { SourceAndTableIdentifierUnion } from "@modules/_shared/InplaceVolumetrics/types";

import { userSelectedPlotTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedColorByAtom,
    selectedEnsembleIdentsAtom,
    selectedFluidZonesAtom,
    selectedIdentifiersValuesAtom,
    selectedResultNameAtom,
    selectedSubplotByAtom,
    selectedTableNamesAtom,
} from "./settings/atoms/derivedAtoms";
import { PlotType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    derivedStates: {
        filter: InplaceVolumetricsFilter;
        resultName: InplaceVolumetricResultName_api | null;
        subplotBy: SourceAndTableIdentifierUnion;
        colorBy: SourceAndTableIdentifierUnion;
        plotType: PlotType;
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
        subplotBy: (get) => get(selectedSubplotByAtom),
        colorBy: (get) => get(selectedColorByAtom),
        plotType: (get) => get(userSelectedPlotTypeAtom),
    },
};
