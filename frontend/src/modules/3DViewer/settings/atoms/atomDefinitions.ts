import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalModuleComponentsInterface } from "@framework/UniDirectionalModuleComponentsInterface";
import { ViewToSettingsInterface } from "@modules/3DViewer/interfaces";

import { atom, useAtom } from "jotai";
import { atomEffect } from "jotai-effect";

import { intersectionTypeAtom } from "./baseAtoms";

export type SettingsAtoms = {
    editCustomIntersectionPolylineEditModeActive: boolean;
};

export function settingsAtomsInitialization(
    viewToSettingsInterface: UniDirectionalModuleComponentsInterface<ViewToSettingsInterface>
): ModuleAtoms<SettingsAtoms> {
    const editCustomIntersectionPolylineEditModeActive = atom((get) => {
        return get(viewToSettingsInterface.getAtom("editCustomIntersectionPolylineEditModeActive"));
    });

    const effect = atomEffect((get, set) => {
        const viewIntersectionType = get(viewToSettingsInterface.getAtom("intersectionType"));
        set(intersectionTypeAtom, viewIntersectionType.value);
    });

    useAtom(effect);

    return {
        editCustomIntersectionPolylineEditModeActive,
    };
}
