import { AtomDefinition, AtomStore } from "@framework/AtomStore";

import { createStore } from "jotai";

export class AtomStorePrivate<S extends AtomDefinition> extends AtomStore<S> {
    getInternalStore(): ReturnType<typeof createStore> {
        return this._store;
    }
}
