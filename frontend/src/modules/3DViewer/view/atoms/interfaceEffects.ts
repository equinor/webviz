import { InterfaceEffects } from "@framework/Module";
import { SettingsToViewInterface } from "@modules/3DViewer/interfaces";

import {
    customIntersectionPolylineIdAtom,
    ensembleIdentAtom,
    highlightedWellboreUuidAtom,
    intersectionTypeAtom,
} from "./baseAtoms";

export const settingsToViewInterfaceEffects: InterfaceEffects<SettingsToViewInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const ensembleIdent = getInterfaceValue("ensembleIdent");
        setAtomValue(ensembleIdentAtom, ensembleIdent);
    },
    (getInterfaceValue, setAtomValue) => {
        const highlightedWellboreUuid = getInterfaceValue("highlightedWellboreUuid");
        setAtomValue(highlightedWellboreUuidAtom, highlightedWellboreUuid);
    },
    (getInterfaceValue, setAtomValue) => {
        const customIntersectionPolylineId = getInterfaceValue("customIntersectionPolylineId");
        setAtomValue(customIntersectionPolylineIdAtom, customIntersectionPolylineId);
    },
    (getInterfaceValue, setAtomValue) => {
        const intersectionType = getInterfaceValue("intersectionType");
        setAtomValue(intersectionTypeAtom, intersectionType);
    },
];
