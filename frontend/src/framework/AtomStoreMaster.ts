import { DefaultError, QueryClient, QueryKey, QueryObserverOptions, QueryObserverResult } from "@tanstack/query-core";
import { QueriesResults } from "@tanstack/react-query";

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

type QueriesOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
> = ((get: Getter) => Omit<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>, "suspense">)[];

export function atomWithQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
>(
    getOptions: (get: Getter) => {
        queries: readonly [...QueriesOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>];
        combine?: (result: QueryObserverResult<TData, TError>[]) => QueryObserverResult<TData, TError>[];
    },
    getQueryClient?: (get: Getter) => QueryClient
): Atom<QueryObserverResult<TData, TError>[]> {
    return atom((get) => {
        const options = getOptions(get);

        const atoms = atom(
            options.queries.map((option) => {
                return atomWithQuery<TQueryFnData, TError, TData, TQueryData, TQueryKey>(option, getQueryClient);
            })
        );

        const results = get(atoms).map((atom) => get(atom));

        if (options.combine) {
            return options.combine(results);
        }

        return results;
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
