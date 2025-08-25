import type { DefaultError, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";
import type { DefinedInitialDataOptions, UndefinedInitialDataOptions } from "@tanstack/react-query";
import { type Atom, type Getter, type Setter, type WritableAtom, atom } from "jotai";
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
    PERSISTENCE = "persistence",
    TEMPLATE = "template",
}

export type PersistableAtomState<T> = {
    value: T;
    _source: Source;
};

function isInternalState<T>(value: T | PersistableAtomState<T>): value is PersistableAtomState<T> {
    return (
        typeof value === "object" &&
        value !== null &&
        "_source" in value &&
        typeof (value as any)._source === "string" &&
        Object.values(Source).includes((value as any)._source)
    );
}

type PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue> = {
    /**
     * The initial value for the atom before any user or persisted value is applied.
     * This is typically a safe default value used when no persisted state is present.
     */
    initialValue: TValue;

    precomputeFunction: (options: { value: TValue; get: Getter }) => TPrecomputedValue;
    /**
     * A function to validate whether the given value is valid in the current application context.
     * Called whenever the atom is read to determine if a persisted value is still valid.
     * This function is also used to decide whether the fixup function should be triggered
     * for user-provided values.
     *
     * @param value - The current atom value to validate.
     * @param get - The Jotai getter to read from other atoms if needed.
     * @param precomputed - The precomputed value from the precompute function.
     */
    isValidFunction: (options: { value: TValue; get: Getter; precomputedValue: TPrecomputedValue }) => boolean;

    /**
     * A function that provides a fallback value when a user-provided value is invalid.
     * This function is only called if the value originates from a user interaction and is invalid.
     * Persisted values are never passed to this function.
     *
     * @param value - The current invalid value that needs fixing.
     * @param get - The Jotai getter to access other atoms, if necessary.
     * @param precomputed - The precomputed value from the precompute function.
     * @returns A valid fallback value to use instead.
     */
    fixupFunction: (options: { value: TValue; get: Getter; precomputedValue: TPrecomputedValue }) => TValue;
};

type PersistableFixableAtomOptionsWithoutPrecompute<TValue> = {
    /**
     * The initial value for the atom before any user or persisted value is applied.
     * This is typically a safe default value used when no persisted state is present.
     */
    initialValue: TValue;

    /**
     * A function to validate whether the given value is valid in the current application context.
     * Called whenever the atom is read to determine if a persisted value is still valid.
     * This function is also used to decide whether the fixup function should be triggered
     * for user-provided values.
     *
     * @param value - The current atom value to validate.
     * @param get - The Jotai getter to read from other atoms if needed.
     */
    isValidFunction: (options: { value: TValue; get: Getter }) => boolean;

    /**
     * A function that provides a fallback value when a user-provided value is invalid.
     * This function is only called if the value originates from a user interaction and is invalid.
     * Persisted values are never passed to this function.
     *
     * @param value - The current invalid value that needs fixing.
     * @param get - The Jotai getter to access other atoms, if necessary.
     * @returns A valid fallback value to use instead.
     */
    fixupFunction: (options: { value: TValue; get: Getter }) => TValue;
};

export type PersistableFixableAtomOptions<TValue, TPrecomputedValue = unknown> =
    | PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue>
    | PersistableFixableAtomOptionsWithoutPrecompute<TValue>;

const PERSISTABLE_ATOM = Symbol("persistableAtom");

export type PersistableFixableRead<TValue> = {
    value: TValue;
    isValidInContext: boolean;
    _source: Source;
};

export function persistableFixableAtom<TValue, TPrecomputedValue>(
    options: PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue>,
): WritableAtom<PersistableFixableRead<TValue>, [TValue | PersistableAtomState<TValue>], void>;

export function persistableFixableAtom<TValue>(
    options: PersistableFixableAtomOptionsWithoutPrecompute<TValue>,
): WritableAtom<PersistableFixableRead<TValue>, [TValue | PersistableAtomState<TValue>], void>;

export function persistableFixableAtom<TValue, TPrecomputedValue>(
    options: PersistableFixableAtomOptions<TValue, TPrecomputedValue>,
): WritableAtom<PersistableFixableRead<TValue>, [TValue | PersistableAtomState<TValue>], void> {
    const internalStateAtom = atom<PersistableAtomState<TValue>>({
        value: options.initialValue,
        _source: Source.USER,
    });

    const hasPrecompute = (
        opts: PersistableFixableAtomOptions<TValue, TPrecomputedValue>,
    ): opts is PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue> =>
        (opts as PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue>).precomputeFunction !==
        undefined;

    const fixableAtom = atom<PersistableFixableRead<TValue>, [TValue | PersistableAtomState<TValue>], void>(
        (get) => {
            const internalState = get(internalStateAtom);

            if (hasPrecompute(options)) {
                const precomputed = options.precomputeFunction({ value: internalState.value, get });

                const isValid = options.isValidFunction({
                    value: internalState.value,
                    get,
                    precomputedValue: precomputed,
                });

                if (internalState._source === Source.PERSISTENCE || internalState._source === Source.TEMPLATE) {
                    return {
                        value: internalState.value,
                        isValidInContext: isValid,
                        _source: internalState._source,
                    };
                }

                return {
                    value: isValid
                        ? internalState.value
                        : options.fixupFunction({ value: internalState.value, get, precomputedValue: precomputed }),
                    isValidInContext: true,
                    _source: internalState._source,
                };
            }

            const isValid = options.isValidFunction({ value: internalState.value, get });

            if (internalState._source === Source.PERSISTENCE || internalState._source === Source.TEMPLATE) {
                return {
                    value: internalState.value,
                    isValidInContext: isValid,
                    _source: internalState._source,
                };
            }

            return {
                value: isValid ? internalState.value : options.fixupFunction({ value: internalState.value, get }),
                isValidInContext: true,
                _source: internalState._source,
            };
        },
        (_, set, update: TValue | PersistableAtomState<TValue>) => {
            if (isInternalState(update)) {
                set(internalStateAtom, {
                    ...update,
                });
                return;
            }

            const newInternalState: PersistableAtomState<TValue> = {
                value: update,
                _source: Source.USER,
            };

            set(internalStateAtom, newInternalState);
        },
    );

    Object.defineProperty(fixableAtom, PERSISTABLE_ATOM, {
        value: true,
        enumerable: false,
    });

    return fixableAtom;
}

type PersistableFlagged = { [PERSISTABLE_ATOM]: true };

export function isPersistableAtom(a: unknown): a is Atom<unknown> & PersistableFlagged {
    return !!(a && typeof a === "object" && (a as any)[PERSISTABLE_ATOM] === true);
}

export function setIfDefined<Value, Result>(
    set: Setter,
    atom: WritableAtom<any, [Value], Result>,
    value: Value | undefined,
): Result | undefined {
    if (value !== undefined) {
        return set(atom, value);
    }
    return undefined;
}
