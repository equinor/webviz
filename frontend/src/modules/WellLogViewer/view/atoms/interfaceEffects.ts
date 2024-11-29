import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/WellLogViewer/interfaces";

import { wellboreHeaderAtom } from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const wellboreUuid = getInterfaceValue("wellboreHeader");
        setAtomValue(wellboreHeaderAtom, wellboreUuid);
    },
];
