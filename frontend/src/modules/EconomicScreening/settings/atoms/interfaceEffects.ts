import type { InterfaceEffects } from "@framework/Module";
import type { ViewToSettingsInterface } from "@modules/EconomicScreening/interfaces";

import { sourceHorizonAtom } from "./baseAtoms";

export const viewToSettingsInterfaceEffects: InterfaceEffects<ViewToSettingsInterface> = [
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(sourceHorizonAtom, getInterfaceValue("sourceHorizon"));
    },
];
