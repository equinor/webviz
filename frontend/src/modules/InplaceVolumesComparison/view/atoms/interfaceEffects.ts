import type { InterfaceEffects } from "@framework/Module";

import type { SettingsToViewInterface } from "../../interfaces";

import {
    areSelectedTablesComparableAtom,
    areSourcesDistinctAtom,
    comparisonEnsembleIdentAtom,
    comparisonTableNameAtom,
    indexColumnsLeftUnfilteredAtom,
    indexColumnsWithNoSelectedValuesAtom,
    indicesWithValuesAtom,
    isIndexValueIntersectionActiveAtom,
    referenceEnsembleIdentAtom,
    referenceTableNameAtom,
    resultNameAtom,
    showTableAtom,
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
        setAtomValue(indexColumnsLeftUnfilteredAtom, getInterfaceValue("indexColumnsLeftUnfiltered"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(isIndexValueIntersectionActiveAtom, getInterfaceValue("isIndexValueIntersectionActive"));
    },
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(indexColumnsWithNoSelectedValuesAtom, getInterfaceValue("indexColumnsWithNoSelectedValues"));
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
    (getInterfaceValue, setAtomValue) => {
        setAtomValue(showTableAtom, getInterfaceValue("showTable"));
    },
];
