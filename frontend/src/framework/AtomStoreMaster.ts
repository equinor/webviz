import { WritableAtom, createStore } from "jotai";

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

    makeAtomStoreForModuleInstance(moduleInstanceId: string) {
        const atomStore = createStore();
        this._atomStores.set(moduleInstanceId, atomStore);

        const atomStates = Array.from(this._atomStates.entries());
        for (const [atom, value] of atomStates) {
            atomStore.set(atom, value);
        }
    }

    getAtomStoreForModuleInstance(moduleInstanceId: string): AtomStore {
        const atomStore = this._atomStores.get(moduleInstanceId);
        if (!atomStore) {
            throw new Error(`No atom store found for module instance with id: ${moduleInstanceId}`);
        }
        return atomStore;
    }

    removeAtomStoreForModuleInstance(moduleInstanceId: string) {
        this._atomStores.delete(moduleInstanceId);
    }
}
