import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/InplaceVolumetricsPlot/interfaces";

import {
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    colorByAtom,
    filterAtom,
    plotTypeAtom,
    resultName2Atom,
    resultNameAtom,
    selectorColumnAtom,
    subplotByAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const filter = getInterfaceValue("filter");
        setAtomValue(filterAtom, filter);
    },
    (getInterfaceValue, setAtomValue) => {
        const resultName = getInterfaceValue("resultName");
        setAtomValue(resultNameAtom, resultName);
    },
    (getInterfaceValue, setAtomValue) => {
        const resultName2 = getInterfaceValue("resultName2");
        setAtomValue(resultName2Atom, resultName2);
    },
    (getInterfaceValue, setAtomValue) => {
        const selectorColumn = getInterfaceValue("selectorColumn");
        setAtomValue(selectorColumnAtom, selectorColumn);
    },
    (getInterfaceValue, setAtomValue) => {
        const subplotBy = getInterfaceValue("subplotBy");
        setAtomValue(subplotByAtom, subplotBy);
    },
    (getInterfaceValue, setAtomValue) => {
        const plotType = getInterfaceValue("plotType");
        setAtomValue(plotTypeAtom, plotType);
    },
    (getInterfaceValue, setAtomValue) => {
        const colorBy = getInterfaceValue("colorBy");
        setAtomValue(colorByAtom, colorBy);
    },
    (getInterfaceValue, setAtomValue) => {
        const areSelectedTablesComparable = getInterfaceValue("areSelectedTablesComparable");
        setAtomValue(areSelectedTablesComparableAtom, areSelectedTablesComparable);
    },
    (getInterfaceValue, setAtomValue) => {
        const areTableDefinitionSelectionsValid = getInterfaceValue("areTableDefinitionSelectionsValid");
        setAtomValue(areTableDefinitionSelectionsValidAtom, areTableDefinitionSelectionsValid);
    },
];
