
import type { Getter } from "jotai";
import { atom } from "jotai";

import { CurrentModuleInstanceIdAtom } from "@framework/GlobalAtoms";

/**
 * Creates an writeable atom that persists it's value in localstorage, but keeps it unique per module instance. **Note: must only be used within a module instances own store**
 * @param storageKey Prefix for the key. Should be unique among a module's atoms. Actual storage key will be: `<prefix>:<moduleInstanceId>`
 * @param initialValue Initial atom value
 * @returns A get/set atom
 */
export function atomWithModuleInstanceStorage<T>(storageKey: string, initialValue: T) {
    // simple atom, needed to trigger new lookups
    const instanceValueAtom = atom<T | null>(null);

    return atom<T, [T], void>(
        (get) => {
            const instanceId = getIntanceId(get);
            const fullStorageKey = makeInstanceStorageKey(instanceId, storageKey);
            const instanceValue = get(instanceValueAtom);
            const storedValue = localStorage.getItem(fullStorageKey);

            if (instanceValue !== null) return instanceValue;
            else if (storedValue !== null) return JSON.parse(storedValue);
            else return initialValue;
        },
        (get, set, newVal: T) => {
            const instanceId = getIntanceId(get);
            const fullStorageKey = makeInstanceStorageKey(instanceId, storageKey);

            localStorage.setItem(fullStorageKey, JSON.stringify(newVal));
            set(instanceValueAtom, newVal);
        },
    );
}

export function clearModuleInstanceStorage(instanceId: string, key: string) {
    const fullKey = makeInstanceStorageKey(instanceId, key);
    localStorage.removeItem(fullKey);
}

function makeInstanceStorageKey(instanceId: string, key: string): string {
    // ! Be mindful about changing this; existing stored values will dissapear!
    return `${key}:${instanceId}`;
}

function getIntanceId(get: Getter): string {
    const id = get(CurrentModuleInstanceIdAtom);

    if (id === null) {
        throw new Error("Module instance not set. Make sure this atom is only used within a module storage");
    }

    return id;
}
