import type { InterfaceEffects } from "@framework/Module";

import type { SettingsToViewInterface } from "../../interfaces";

import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    comparisonEnsembleIdentAtom,
    comparisonTableNameAtom,
    indicesWithValuesAtom,
    referenceEnsembleIdentAtom,
    referenceTableNameAtom,
    resultNameAtom,
    subplotByAtom,
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
        setAtomValue(referenceTableNameAtom, getInterfaceValue("referenceTableName"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(comparisonTableNameAtom, getInterfaceValue("comparisonTableName"));
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
        setAtomValue(areSourcesDistinctAtom, getInterfaceValue("areSourcesDistinct"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(areSelectedTablesComparableAtom, getInterfaceValue("areSelectedTablesComparable"));
    },
];
