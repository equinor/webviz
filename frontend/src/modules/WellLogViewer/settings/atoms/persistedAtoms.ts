import type { TemplateTrackConfig } from "@modules/WellLogViewer/types";
import { atomWithModuleInstanceStorage, clearModuleInstanceStorage } from "@modules/WellLogViewer/utils/atoms";

import type { Getter, Setter } from "jotai";
import { atom } from "jotai";
import type { Dictionary } from "lodash";

const STORAGE_KEY = "moduleSettings";
const moduleSettingsAtom = atomWithModuleInstanceStorage<Dictionary<any>>(STORAGE_KEY, {});

function getPersistentModuleField(get: Getter, valueKey: string, defaultValue: any): typeof defaultValue {
    return get(moduleSettingsAtom)[valueKey] ?? defaultValue;
}

function setPersistentModuleField(get: Getter, set: Setter, valueKey: string, newValue: any) {
    const storageCopy = { ...get(moduleSettingsAtom) };
    storageCopy[valueKey] = newValue;

    set(moduleSettingsAtom, storageCopy);
}

export const logViewerTrackConfigsAtom = atom<TemplateTrackConfig[], [TemplateTrackConfig[]], void>(
    (get) => getPersistentModuleField(get, "logViewerTrackConfigs", []),
    (get, set, newVal) => setPersistentModuleField(get, set, "logViewerTrackConfigs", newVal),
);

export const viewerHorizontalAtom = atom<boolean, [boolean], void>(
    (get) => getPersistentModuleField(get, "viewerHorizontal", false),
    (get, set, newVal) => setPersistentModuleField(get, set, "viewerHorizontal", newVal),
);

export const padDataWithEmptyRowsAtom = atom<boolean, [boolean], void>(
    (get) => getPersistentModuleField(get, "padDataWithEmptyRows", true),
    (get, set, newVal) => setPersistentModuleField(get, set, "padDataWithEmptyRows", newVal),
);

export function clearStorageForInstance(instanceId: string) {
    clearModuleInstanceStorage(instanceId, STORAGE_KEY);
}
