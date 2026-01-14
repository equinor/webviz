import type { InterfaceEffects } from "@framework/Module";
import type { SettingsToViewInterface } from "@modules/InplaceVolumesNew/interfaces";

import {
    areTableDefinitionSelectionsValidAtom,
    colorByAtom,
    filterAtom,
    plotTypeAtom,
    firstResultNameAtom,
    selectorColumnAtom,
    subplotByAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const filter = getInterfaceValue("filter");
        setAtomValue(filterAtom, filter);
    },
    (getInterfaceValue, setAtomValue) => {
        const firstResultName = getInterfaceValue("firstResultName");
        setAtomValue(firstResultNameAtom, firstResultName);
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
        const areTableDefinitionSelectionsValid = getInterfaceValue("areTableDefinitionSelectionsValid");
        setAtomValue(areTableDefinitionSelectionsValidAtom, areTableDefinitionSelectionsValid);
    },
];
