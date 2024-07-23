import { StatisticFunction_api } from "@api";
import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { Wellbore } from "@framework/types/wellbore";
import {
    IntersectionSettings,
    SurfaceSetAddress,
    VisualizationMode,
} from "@modules/StructuralUncertaintyIntersection/typesAndEnums";

import {
    intersectionSettingsAtom,
    statisticFunctionsAtom,
    stratigraphyColorMapAtom,
    surfaceSetAddressAtom,
    visualizationModeAtom,
    wellboreAddressAtom,
} from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    wellboreAddress: Wellbore | null;
    surfaceSetAddress: SurfaceSetAddress | null;
    visualizationMode: VisualizationMode;
    stratigraphyColorMap: { [name: string]: string };
    statisticFunctions: StatisticFunction_api[];
    intersectionSettings: IntersectionSettings;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    wellboreAddress: (get) => {
        return get(wellboreAddressAtom);
    },
    surfaceSetAddress: (get) => {
        return get(surfaceSetAddressAtom);
    },
    visualizationMode: (get) => {
        return get(visualizationModeAtom);
    },
    stratigraphyColorMap: (get) => {
        return get(stratigraphyColorMapAtom);
    },
    statisticFunctions: (get) => {
        return get(statisticFunctionsAtom);
    },
    intersectionSettings: (get) => {
        return get(intersectionSettingsAtom);
    },
};
