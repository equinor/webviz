import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { SurfaceAddress } from "@modules/_shared/Surface/surfaceAddress";

import { surfaceAddressAtom } from "./settings/atoms/baseAtoms";

type SettingsToViewInterface = {
    surfaceAddress: SurfaceAddress | null;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    surfaceAddress: (get) => get(surfaceAddressAtom),
};
