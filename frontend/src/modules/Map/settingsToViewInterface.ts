import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { SurfaceAddress } from "@modules/_shared/Surface/surfaceAddress";

import { surfaceAddressAtom } from "./settings/atoms/baseAtoms";

export type SettingsToViewInterface = {
    surfaceAddress: SurfaceAddress | null;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    surfaceAddress: (get) => get(surfaceAddressAtom),
};
