import { InterfaceEffects } from "@framework/Module";
import { ViewToSettingsInterface } from "@modules/3DViewer/interfaces";

import { editCustomIntersectionPolylineEditModeActiveAtom, intersectionTypeAtom } from "./baseAtoms";

export const viewToSettingsInterfaceEffects: InterfaceEffects<ViewToSettingsInterface> = [
    (get, set) => {
        const editCustomIntersectionPolylineEditModeActive = get("editCustomIntersectionPolylineEditModeActive");
        set(editCustomIntersectionPolylineEditModeActiveAtom, editCustomIntersectionPolylineEditModeActive);
    },
    (get, set) => {
        const viewIntersectionType = get("intersectionType");
        set(intersectionTypeAtom, viewIntersectionType);
    },
];
