import { InterfaceEffects } from "@framework/Module";

import { relPermSpecificationsAtom, selectedColorByAtom, selectedVisualizationTypeAtom } from "./baseAtoms";

import { SettingsToViewInterface } from "../../interfaces";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const relPermSpecifications = getInterfaceValue("relPermSpecifications");
        setAtomValue(relPermSpecificationsAtom, relPermSpecifications);
    },
    (getInterfaceValue, setAtomValue) => {
        const colorBy = getInterfaceValue("colorBy");
        setAtomValue(selectedColorByAtom, colorBy);
    },
    (getInterfaceValue, setAtomValue) => {
        const visualizationType = getInterfaceValue("visualizationType");
        setAtomValue(selectedVisualizationTypeAtom, visualizationType);
    },
];
