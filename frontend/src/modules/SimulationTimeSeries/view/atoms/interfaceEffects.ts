import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/SimulationTimeSeries/interfaces";

import {
    interfaceColorByParameterAtom,
    parameterIdentAtom,
    resampleFrequencyAtom,
    selectedEnsemblesAtom,
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
    (getInterfaceValue, setAtomValue) => {
        const interfaceColorByParameter = getInterfaceValue("colorByParameter");
        setAtomValue(interfaceColorByParameterAtom, interfaceColorByParameter);
    },
    (getInterfaceValue, setAtomValue) => {
        const parameterIdent = getInterfaceValue("parameterIdent");
        setAtomValue(parameterIdentAtom, parameterIdent);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectedEnsembles = getInterfaceValue("selectedEnsembles");
        setAtomValue(selectedEnsemblesAtom, selectedEnsembles);
    },
];
