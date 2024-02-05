import { QueryClient } from "@tanstack/query-core";
import { QueriesOptions, QueriesResults } from "@tanstack/react-query";

import { Atom, Getter, WritableAtom, atom, createStore } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { atomWithReducer } from "jotai/utils";

export function atomWithCompare<Value>(initialValue: Value, areEqual: (prev: Value, next: Value) => boolean) {
    return atomWithReducer(initialValue, (prev: Value, next: Value) => {
        if (areEqual(prev, next)) {
            return prev;
        }

        return next;
    });
}

export function atomWithQueries<T extends Array<any>, TCombinedResult = QueriesResults<T>>(
    getOptions: (get: Getter) => {
        queries: readonly [...QueriesOptions<T>];
        combine?: (result: QueriesResults<T>) => TCombinedResult;
    },
    getQueryClient?: (get: Getter) => QueryClient
): Atom<TCombinedResult> {
    return atom((get) => {
        const options = getOptions(get);

        const atoms = options.queries.map((option) => {
            return atomWithQuery<T>(option, getQueryClient);
        });

        const results = atoms.map((atom) => get(atom));

        if (options.combine) {
            return options.combine(results as QueriesResults<T>);
        }

        return results as TCombinedResult;
    });
}

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
