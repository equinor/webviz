import { ModuleAtoms } from "@framework/Module";

export type SettingsAtoms = Record<string, never>;

export function settingsAtomsInitialization(): ModuleAtoms<SettingsAtoms> {
    return {};
}
