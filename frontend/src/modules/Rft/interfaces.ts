import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import { rftWellAddressAtom } from "./settings/atoms/baseAtoms";
import { RftWellAddress } from "./typesAndEnums";

type SettingsToViewInterface = { rftWellAddress: RftWellAddress | null };

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    rftWellAddress: (get) => {
        return get(rftWellAddressAtom);
    },
};
