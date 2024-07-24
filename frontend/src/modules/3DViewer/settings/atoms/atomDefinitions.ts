import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalModuleComponentsInterface } from "@framework/UniDirectionalModuleComponentsInterface";
import { IntersectionType } from "@framework/types/intersection";
import { ViewToSettingsInterface } from "@modules/3DViewer/interfaces";

import { atom } from "jotai";

import { intersectionTypeAtom as viewIntersectionTypeAtom } from "./baseAtoms";

export type SettingsAtoms = {
    editCustomIntersectionPolylineEditModeActive: boolean;
    intersectionType: IntersectionType;
};

export function settingsAtomsInitialization(
    viewToSettingsInterface: UniDirectionalModuleComponentsInterface<ViewToSettingsInterface>
): ModuleAtoms<SettingsAtoms> {
    const editCustomIntersectionPolylineEditModeActive = atom((get) => {
        return get(viewToSettingsInterface.getAtom("editCustomIntersectionPolylineEditModeActive"));
    });

    const intersectionType = atom((get, set) => {
        const viewIntersectionType = get(viewToSettingsInterface.getAtom("intersectionType"));
        const settingsIntersectionType = get(viewIntersectionTypeAtom);

        return settingsIntersectionType; // viewIntersectionType;
    });

    return {
        editCustomIntersectionPolylineEditModeActive,
        intersectionType,
    };
}
