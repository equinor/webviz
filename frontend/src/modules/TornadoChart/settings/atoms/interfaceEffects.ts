import { InterfaceEffects } from "@framework/Module";
import { ViewToSettingsInterface } from "@modules/TornadoChart/interfaces";

import { selectedSensitivityAtom } from "./baseAtoms";

export const viewToSettingsInterfaceEffects: InterfaceEffects<ViewToSettingsInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const selectedSensitivity = getInterfaceValue("selectedSensitivity");
        setAtomValue(selectedSensitivityAtom, selectedSensitivity);
    },
];
