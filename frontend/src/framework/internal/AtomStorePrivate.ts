import { AtomStore } from "@framework/AtomStore";

import { Atom, createStore } from "jotai";

export class AtomStorePrivate extends AtomStore {
    getInternalStore(): ReturnType<typeof createStore> {
        return this._store;
    }

    getAtoms(): Atom<unknown>[] {
        return [...this._atoms.keys()];
    }
}
