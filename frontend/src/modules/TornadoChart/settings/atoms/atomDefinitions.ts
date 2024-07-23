import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalModuleComponentsInterface } from "@framework/UniDirectionalModuleComponentsInterface";
import { ViewToSettingsInterface } from "@modules/TornadoChart/interfaces";
import { SelectedSensitivity } from "@modules/TornadoChart/typesAndEnums";

import { atom } from "jotai";

export type SettingsAtoms = {
    selectedSensitivityAtom: SelectedSensitivity | null;
};

export function settingsAtomsInitialization(
    viewToSettingsInterface: UniDirectionalModuleComponentsInterface<ViewToSettingsInterface>
): ModuleAtoms<SettingsAtoms> {
    const selectedSensitivityAtom = atom((get) => {
        return get(viewToSettingsInterface.getAtom("selectedSensitivity"));
    });

    return {
        selectedSensitivityAtom,
    };
}
