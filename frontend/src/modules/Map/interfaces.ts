import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import type { FullSurfaceAddress } from "@modules/_shared/Surface/surfaceAddress";

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
