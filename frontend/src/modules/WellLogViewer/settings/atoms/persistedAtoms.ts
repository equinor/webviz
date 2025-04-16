import { atomWithModuleInstanceStorage, clearModuleInstanceStorage } from "@modules/WellLogViewer/utils/atoms";
import type { SerializedDataProviderManager } from "@modules/_shared/DataProviderFramework/interfacesAndTypes/serialization";

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

export const viewerHorizontalAtom = atom<boolean, [boolean], void>(
    (get) => getPersistentModuleField(get, "viewerHorizontal", false),
    (get, set, newVal) => setPersistentModuleField(get, set, "viewerHorizontal", newVal),
);

export const padDataWithEmptyRowsAtom = atom<boolean, [boolean], void>(
    (get) => getPersistentModuleField(get, "padDataWithEmptyRows", true),
    (get, set, newVal) => setPersistentModuleField(get, set, "padDataWithEmptyRows", newVal),
);

export const serializedManagerStateAtom = atom<SerializedDataProviderManager, [SerializedDataProviderManager], void>(
    (get) => getPersistentModuleField(get, "providerManagerState", undefined),
    (get, set, newVal) => setPersistentModuleField(get, set, "providerManagerState", newVal),
);

export function clearStorageForInstance(instanceId: string) {
    clearModuleInstanceStorage(instanceId, STORAGE_KEY);
}
