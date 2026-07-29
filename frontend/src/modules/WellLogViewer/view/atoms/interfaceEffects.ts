import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/WellLogViewer/interfaces";

import { selectedFieldIdentAtom, wellboreHeaderAtom } from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const wellboreHeader = getInterfaceValue("wellboreHeaderStatus").header;
        const selectedField = getInterfaceValue("selectedField");

        setAtomValue(selectedFieldIdentAtom, selectedField);
        setAtomValue(wellboreHeaderAtom, wellboreHeader);
    },
];
