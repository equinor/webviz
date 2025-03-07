import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/SimulationTimeSeries/interfaces";

import {
    resampleFrequencyAtom,
    showObservationsAtom,
    vectorSpecificationsAtom,
    visualizationModeAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const vectorSpecifications = getInterfaceValue("vectorSpecifications");
        setAtomValue(vectorSpecificationsAtom, vectorSpecifications);
    },
    (getInterfaceValue, setAtomValue) => {
        const resampleFrequency = getInterfaceValue("resampleFrequency");
        setAtomValue(resampleFrequencyAtom, resampleFrequency);
    },
    (getInterfaceValue, setAtomValue) => {
        const visualizationMode = getInterfaceValue("visualizationMode");
        setAtomValue(visualizationModeAtom, visualizationMode);
    },
    (getInterfaceValue, setAtomValue) => {
        const showObservations = getInterfaceValue("showObservations");
        setAtomValue(showObservationsAtom, showObservations);
    },
];
