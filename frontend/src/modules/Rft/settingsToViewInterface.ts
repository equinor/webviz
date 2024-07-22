import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { rftWellAddressAtom } from "./settings/atoms/baseAtoms";
import { RftWellAddress } from "./typesAndEnums";

export type SettingsToViewInterface = { rftWellAddress: RftWellAddress | null };

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    rftWellAddress: (get) => {
        return get(rftWellAddressAtom);
    },
};
