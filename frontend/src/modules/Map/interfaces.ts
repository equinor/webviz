import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { FullSurfaceAddress } from "@modules/_shared/Surface/surfaceAddress";

import { surfaceAddressAtom } from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    surfaceAddress: FullSurfaceAddress | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    surfaceAddress: (get) => get(surfaceAddressAtom),
};
