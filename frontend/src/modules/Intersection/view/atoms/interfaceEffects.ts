import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/Intersection/interfaces";

import {
    intersectionExtensionLengthAtom,
    intersectionTypeAtom,
    selectedCustomIntersectionPolylineIdAtom,
    wellboreHeaderAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const selectedCustomIntersectionPolylineId = getInterfaceValue("selectedCustomIntersectionPolylineId");
        setAtomValue(selectedCustomIntersectionPolylineIdAtom, selectedCustomIntersectionPolylineId);
    },
    (getInterfaceValue, setAtomValue) => {
        const intersectionType = getInterfaceValue("intersectionType");
        setAtomValue(intersectionTypeAtom, intersectionType);
    },
    (getInterfaceValue, setAtomValue) => {
        const wellboreHeader = getInterfaceValue("wellboreHeader");
        setAtomValue(wellboreHeaderAtom, wellboreHeader);
    },
    (getInterfaceValue, setAtomValue) => {
        const intersectionExtensionLength = getInterfaceValue("intersectionExtensionLength");
        setAtomValue(intersectionExtensionLengthAtom, intersectionExtensionLength);
    },
];
