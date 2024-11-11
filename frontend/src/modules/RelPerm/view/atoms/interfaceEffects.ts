import { InterfaceEffects } from "@framework/Module";


import {
    selectedColorByAtom,
    selectedEnsembleIdentAtom,
    selectedRealizationNumbersAtom,
    selectedRelPermCurveNamesAtom,
    selectedSatNumsAtom,
    selectedSaturationAxisAtom,
    selectedTableNameAtom,
    selectedVisualizationTypeAtom,
} from "./baseAtoms";

import { SettingsToViewInterface } from "../../interfaces";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const ensembleIdent = getInterfaceValue("ensembleIdent");
        setAtomValue(selectedEnsembleIdentAtom, ensembleIdent);
    },
    (getInterfaceValue, setAtomValue) => {
        const realizationNumbers = getInterfaceValue("realizationNumbers");
        setAtomValue(selectedRealizationNumbersAtom, realizationNumbers);
    },
    (getInterfaceValue, setAtomValue) => {
        const tableName = getInterfaceValue("tableName");
        setAtomValue(selectedTableNameAtom, tableName);
    },
    (getInterfaceValue, setAtomValue) => {
        const saturationAxis = getInterfaceValue("saturationAxis");
        setAtomValue(selectedSaturationAxisAtom, saturationAxis);
    },
    (getInterfaceValue, setAtomValue) => {
        const satNums = getInterfaceValue("satNums");
        setAtomValue(selectedSatNumsAtom, satNums);
    },
    (getInterfaceValue, setAtomValue) => {
        const relPermCurveNames = getInterfaceValue("relPermCurveNames");
        setAtomValue(selectedRelPermCurveNamesAtom, relPermCurveNames);
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
