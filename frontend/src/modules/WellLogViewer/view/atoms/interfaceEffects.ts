import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/WellLogViewer/interfaces";

import { selectedFieldIdentAtom, wellboreHeaderAtom } from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const wellboreUuid = getInterfaceValue("wellboreHeader");
        setAtomValue(wellboreHeaderAtom, wellboreUuid);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectedField = getInterfaceValue("selectedField");
        setAtomValue(selectedFieldIdentAtom, selectedField);
    },
];
