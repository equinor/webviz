import type { InterfaceEffects } from "@framework/Module";

import type { SettingsToViewInterface } from "../../interfaces";

import {
    ensembleIdentsAtom,
    isEnsembleSelectionValidAtom,
    isResponseNameValidAtom,
    isWellNameValidAtom,
    responseNameAtom,
    timestampAtom,
    validRealizationNumbersAtom,
    wellNameAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(ensembleIdentsAtom, getInterfaceValue("ensembleIdents"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(isEnsembleSelectionValidAtom, getInterfaceValue("isEnsembleSelectionValid"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(wellNameAtom, getInterfaceValue("wellName"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(isWellNameValidAtom, getInterfaceValue("isWellNameValid"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(responseNameAtom, getInterfaceValue("responseName"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(isResponseNameValidAtom, getInterfaceValue("isResponseNameValid"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(timestampAtom, getInterfaceValue("timestamp"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(validRealizationNumbersAtom, getInterfaceValue("validRealizationNumbers"));
    },
];
