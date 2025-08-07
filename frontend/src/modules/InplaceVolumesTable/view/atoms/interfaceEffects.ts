import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/InplaceVolumesTable/interfaces";

import {
    groupByIndicesAtom,
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
        const resultNames = getInterfaceValue("resultNames");
        setAtomValue(resultNamesAtom, resultNames);
    },
    (getInterfaceValue, setAtomValue) => {
        const groupByIndices = getInterfaceValue("groupByIndices");
        setAtomValue(groupByIndicesAtom, groupByIndices);
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
