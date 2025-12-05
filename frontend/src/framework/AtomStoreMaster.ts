import type { WritableAtom } from "jotai";
import { createStore } from "jotai";

import { CurrentModuleInstanceIdAtom } from "./GlobalAtoms";

export type AtomStore = ReturnType<typeof createStore>;

export class AtomStoreMaster {
    private _atomStates: Map<WritableAtom<any, [any], unknown>, any> = new Map();
    private _atomStores: Map<string, AtomStore> = new Map();

    setAtomValue(atom: WritableAtom<any, [any], unknown>, value: any) {
        this._atomStates.set(atom, value);

        this._atomStores.forEach((atomStore) => {
            atomStore.set(atom, value);
        });
    }

    makeAtomStoreForModuleInstance(moduleInstanceId: string): AtomStore {
        if (this._atomStores.has(moduleInstanceId)) {
            throw new Error(`Atom store for module instance with id ${moduleInstanceId} already exists`);
        }

        const atomStore = createStore();
        // Make the module's own id available within each module's store
        atomStore.set(CurrentModuleInstanceIdAtom, moduleInstanceId);
        this._atomStores.set(moduleInstanceId, atomStore);

        const atomStates = Array.from(this._atomStates.entries());
        for (const [atom, value] of atomStates) {
            atomStore.set(atom, value);
        }

        return atomStore;
    }

    getAtomStoreForModuleInstance(moduleInstanceId: string): AtomStore | null {
        const atomStore = this._atomStores.get(moduleInstanceId);
        if (!atomStore) {
            console.debug(`No atom store found for module instance with id ${moduleInstanceId}`);
            return null;
        }
        return atomStore;
    }

    removeAtomStoreForModuleInstance(moduleInstanceId: string) {
        this._atomStores.delete(moduleInstanceId);
    }
}
