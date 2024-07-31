import { InterfaceEffects } from "@framework/Module";
import { ViewToSettingsInterface } from "@modules/3DViewer/interfaces";

import { editCustomIntersectionPolylineEditModeActiveAtom, intersectionTypeAtom } from "./baseAtoms";

export const viewToSettingsInterfaceEffects: InterfaceEffects<ViewToSettingsInterface> = [
    (getInterfaceValue, setAtomValue) => {
        const editCustomIntersectionPolylineEditModeActive = getInterfaceValue(
            "editCustomIntersectionPolylineEditModeActive"
        );
        setAtomValue(editCustomIntersectionPolylineEditModeActiveAtom, editCustomIntersectionPolylineEditModeActive);
    },
    (getInterfaceValue, setAtomValue) => {
        const viewIntersectionType = getInterfaceValue("intersectionType");
        setAtomValue(intersectionTypeAtom, viewIntersectionType);
    },
];
