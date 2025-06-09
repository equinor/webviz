import type { InterfaceEffects } from "@framework/Module";

import { curveTypeAtom, relPermSpecificationsAtom, visualizationSettingsAtom } from "./baseAtoms";

import type { SettingsToViewInterface } from "../../interfaces";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const relPermSpecifications = getInterfaceValue("relPermSpecifications");
        setAtomValue(relPermSpecificationsAtom, relPermSpecifications);
    },
    (getInterfaceValue, setAtomValue) => {
        const curveType = getInterfaceValue("curveType");
        setAtomValue(curveTypeAtom, curveType);
    },
    (getInterfaceValue, setAtomValue) => {
        const visualizationSettings = getInterfaceValue("visualizationSettings");
        setAtomValue(visualizationSettingsAtom, visualizationSettings);
    },
    (getInterfaceValue, setAtomValue) => {
        const visualizationType = getInterfaceValue("visualizationType");
        setAtomValue(visualizationSettingsAtom, (prev) => ({ ...prev, visualizationType }));
    },
];
