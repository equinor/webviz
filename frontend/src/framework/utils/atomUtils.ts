import type { DefaultError, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";
import type { DefinedInitialDataOptions, UndefinedInitialDataOptions } from "@tanstack/react-query";
import { type Atom, type Getter, atom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import type { AtomWithQueryOptions } from "jotai-tanstack-query";
import { atomWithQuery } from "jotai-tanstack-query";

export function atomWithCompare<Value>(initialValue: Value, areEqualFunc: (prev: Value, next: Value) => boolean) {
    return atomWithReducer(initialValue, (prev: Value, next: Value) => {
        if (areEqualFunc(prev, next)) {
            return prev;
        }

        return next;
    });
}

type QueriesOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
> = ((
    get: Getter,
) =>
    | DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
    | UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
    | AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryKey>)[];

export function atomWithQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TCombinedResult = QueryObserverResult<TData, TError>[],
>(
    getOptions: (get: Getter) => {
        queries: readonly [...QueriesOptions<TQueryFnData, TError, TData, TQueryKey>];
        combine?: (result: QueryObserverResult<TData, TError>[]) => TCombinedResult;
    },
    getQueryClient?: (get: Getter) => QueryClient,
): Atom<TCombinedResult> {
    const optionsAtom = atom(getOptions);
    const atoms = atom((get) => {
        const options = get(optionsAtom);

        const queries = options.queries.map((option) => {
            return atomWithQuery<TQueryFnData, TError, TData, TQueryKey>(option, getQueryClient);
        });

        return queries;
    });
    return atom((get) => {
        const options = get(optionsAtom);
        const results = get(atoms).map((atom) => get(atom));

        if (options.combine) {
            return options.combine(results) as TCombinedResult;
        }

        return results as TCombinedResult;
    });
}

export enum Source {
    USER = "user",
    PERSISTED = "persisted",
}

export type PersistableAtomState<T> = {
    value: T;
    _source: Source;
};

function isInternalState<T>(value: T | PersistableAtomState<T>): value is PersistableAtomState<T> {
    return (value as PersistableAtomState<T>)._source !== undefined;
}

export type PersistableFixableAtomOptions<T> = {
    initialValue: T;
    isValidFunction: (value: T, get: Getter) => boolean;
    fixupFunction: (value: T, get: Getter) => T;
};

const PERSISTABLE_ATOM = Symbol("persistableAtom");

export function persistableFixableAtom<T>(options: PersistableFixableAtomOptions<T>) {
    const internalStateAtom = atom<PersistableAtomState<T>>({
        value: options.initialValue,
        _source: Source.USER,
    });

    const fixableAtom = atom(
        (get) => {
            const internalState = get(internalStateAtom);
            if (internalState._source === Source.PERSISTED) {
                const isValid = options.isValidFunction(internalState.value, get);
                return {
                    value: internalState.value,
                    isValidPersistedValue: isValid,
                };
            }

            const fixedValue = options.fixupFunction(internalState.value, get);
            return {
                value: fixedValue,
                isValidPersistedValue: true,
            };
        },
        (_, set, update: T | PersistableAtomState<T>) => {
            if (isInternalState(update)) {
                set(internalStateAtom, {
                    ...update,
                });
                return;
            }

            const newInternalState: PersistableAtomState<T> = {
                value: update,
                _source: Source.USER,
            };

            set(internalStateAtom, newInternalState);
        },
    );

    (fixableAtom as any)[PERSISTABLE_ATOM] = true;

    return fixableAtom;
}

export function isPersistableAtom(atom: unknown): atom is Atom<PersistableAtomState<unknown>> {
    return !!(atom && typeof atom === "object" && (atom as any)[PERSISTABLE_ATOM]);
}
