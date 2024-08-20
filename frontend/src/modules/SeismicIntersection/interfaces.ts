import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { Wellbore } from "@framework/types/wellbore";

import {
    extensionAtom,
    seismicAddressAtom,
    surfaceAddressAtom,
    wellboreAddressAtom,
    wellborePickCaseUuidAtom,
    wellborePickSelectionAtom,
    zScaleAtom,
} from "./settings/atoms/baseAtoms";
import { SeismicAddress, SurfaceAddress, WellborePickSelectionType } from "./typesAndEnums";

type SettingsToViewInterface = {
    wellboreAddress: Wellbore | null;
    seismicAddress: SeismicAddress | null;
    surfaceAddress: SurfaceAddress | null;
    wellborePickCaseUuid: string | null;
    wellborePickSelection: WellborePickSelectionType;
    extension: number;
    zScale: number;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    wellboreAddress: (get) => {
        return get(wellboreAddressAtom);
    },
    seismicAddress: (get) => {
        return get(seismicAddressAtom);
    },
    surfaceAddress: (get) => {
        return get(surfaceAddressAtom);
    },
    wellborePickCaseUuid: (get) => {
        return get(wellborePickCaseUuidAtom);
    },
    wellborePickSelection: (get) => {
        return get(wellborePickSelectionAtom);
    },
    extension: (get) => {
        return get(extensionAtom);
    },
    zScale: (get) => {
        return get(zScaleAtom);
    },
};
