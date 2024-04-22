import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalSettingsToViewInterface } from "@framework/UniDirectionalSettingsToViewInterface";

import { atom } from "jotai";

import { Interface } from "./settingsToViewInterface";
import { GroupBy } from "./typesAndEnums";

export type SettingsAtoms = {
    test: GroupBy;
};

export type ViewAtoms = {
    test: string;
};

export function settingsAtomsInitialization(
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<Interface>
): ModuleAtoms<SettingsAtoms> {
    return {
        test: atom<GroupBy>((get) => {
            return get(settingsToViewInterface.getAtom("groupBy"));
        }),
    };
}
