import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/InplaceVolumetricsTable/interfaces";

import { areTableDefinitionSelectionsValidAtom } from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (get, set) => {
        const areTableDefinitionSelectionsValid = get("areTableDefinitionSelectionsValid");
        set(areTableDefinitionSelectionsValidAtom, areTableDefinitionSelectionsValid);
    },
];
