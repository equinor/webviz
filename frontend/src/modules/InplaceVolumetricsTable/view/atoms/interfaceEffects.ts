import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/InplaceVolumetricsTable/interfaces";

import {
    accumulationOptionsAtom,
    areSelectedTablesComparableAtom,
    areTableDefinitionSelectionsValidAtom,
    filterAtom,
    resultNamesAtom,
    statisticOptionsAtom,
    tableTypeAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const filter = getInterfaceValue("filter");
        setAtomValue(filterAtom, filter);
    },
    (getInterfaceValue, setAtomValue) => {
        const areSelectedTablesComparable = getInterfaceValue("areSelectedTablesComparable");
        setAtomValue(areSelectedTablesComparableAtom, areSelectedTablesComparable);
    },
    (getInterfaceValue, setAtomValue) => {
        const resultNames = getInterfaceValue("resultNames");
        setAtomValue(resultNamesAtom, resultNames);
    },
    (getInterfaceValue, setAtomValue) => {
        const accumulationOptions = getInterfaceValue("accumulationOptions");
        setAtomValue(accumulationOptionsAtom, accumulationOptions);
    },
    (getInterfaceValue, setAtomValue) => {
        const tableType = getInterfaceValue("tableType");
        setAtomValue(tableTypeAtom, tableType);
    },
    (getInterfaceValue, setAtomValue) => {
        const statisticOptions = getInterfaceValue("statisticOptions");
        setAtomValue(statisticOptionsAtom, statisticOptions);
    },
    (getInterfaceValue, setAtomValue) => {
        const areTableDefinitionSelectionsValid = getInterfaceValue("areTableDefinitionSelectionsValid");
        setAtomValue(areTableDefinitionSelectionsValidAtom, areTableDefinitionSelectionsValid);
    },
];
