import type { InterfaceEffects } from "@framework/Module";

import type { SettingsToViewInterface } from "../../interfaces";

import {
    areSelectedTablesComparableAtom,
    comparisonEnsembleIdentAtom,
    indicesWithValuesAtom,
    isEnsemblePairValidAtom,
    referenceEnsembleIdentAtom,
    resultNameAtom,
    subplotByAtom,
    tableNameAtom,
    waterfallFactorSpecAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(referenceEnsembleIdentAtom, getInterfaceValue("referenceEnsembleIdent"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(comparisonEnsembleIdentAtom, getInterfaceValue("comparisonEnsembleIdent"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(tableNameAtom, getInterfaceValue("tableName"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(resultNameAtom, getInterfaceValue("resultName"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(subplotByAtom, getInterfaceValue("subplotBy"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(indicesWithValuesAtom, getInterfaceValue("indicesWithValues"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(waterfallFactorSpecAtom, getInterfaceValue("waterfallFactorSpec"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(isEnsemblePairValidAtom, getInterfaceValue("isEnsemblePairValid"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(areSelectedTablesComparableAtom, getInterfaceValue("areSelectedTablesComparable"));
    },
];
