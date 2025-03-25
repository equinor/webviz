import type { InterfaceEffects } from "@framework/Module";

import { relPermSpecificationsAtom, visualizationSettingsAtom } from "./baseAtoms";

import type { SettingsToViewInterface } from "../../interfaces";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const relPermSpecifications = getInterfaceValue("relPermSpecifications");
        setAtomValue(relPermSpecificationsAtom, relPermSpecifications);
    },
    (getInterfaceValue, setAtomValue) => {
        const visualizationSettings = getInterfaceValue("visualizationSettings");
        setAtomValue(visualizationSettingsAtom, visualizationSettings);
    },
];
