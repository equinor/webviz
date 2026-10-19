import React from "react";

import type { DefaultError, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";
import type { DefinedInitialDataOptions, UndefinedInitialDataOptions } from "@tanstack/react-query";
import type { Atom, Getter, Setter, WritableAtom } from "jotai";
import { atom } from "jotai";
import { atomWithReducer, useAtomCallback } from "jotai/utils";
import { atomEffect } from "jotai-effect";
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

export function useStableAtomGetter<T>(anAtom: Atom<T>) {
    return useAtomCallback(React.useCallback((get) => get(anAtom), [anAtom]));
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

/**
 * - "loading": dependencies are actively being resolved (e.g. a query is genuinely fetching).
 * - "blocked": dependencies are not yet resolved, but nothing is actively happening either - e.g. a
 *   query that's currently disabled because it's gated on another, invalid upstream
 *   persistableFixableAtom (see the query-gating convention used across modules). Behaves exactly
 *   like "loading" for settle/promotion purposes (see below), but is exposed separately so a
 *   consumer can tell "actually fetching, show a spinner" apart from "blocked on something else,
 *   don't show a spinner that won't resolve on its own" - without every call site having to work
 *   that distinction out itself.
 * - "error": one or more dependencies have an error.
 * - "loaded": all dependencies are ready.
 */
export type PersistableAtomDependenciesState = "loading" | "blocked" | "error" | "loaded";

type QueryLikeResult = {
    isFetching: boolean;
    isError: boolean;
    isPending: boolean;
};

/**
 * Standard way to derive a persistableFixableAtom's `computeDependenciesState` from a single
 * TanStack Query result - including a currently-disabled query (e.g. one gated on an invalid
 * upstream persistableFixableAtom's validity, per the query-gating convention used across modules).
 *
 * A disabled query never fetches, so `isFetching`/`isError` are both false on it, same as a query
 * that genuinely finished successfully - but it must NOT be reported as "loaded". `dependenciesState`
 * gates `dependenciesResolved` in persistableFixableAtom's lifecycle effect, which in turn gates BOTH
 * the one-time settle-fixup and the PERSISTENCE/TEMPLATE -> USER promotion. Reporting "loaded" while
 * disabled would let either of those fire against an empty/meaningless options set that has nothing
 * to do with the setting's real availability, corrupting or discarding a perfectly good persisted
 * value. `isPending` (true for both "disabled" and "genuinely still fetching") is what correctly
 * keeps this unresolved until the query has actually had a chance to run - reported as "blocked"
 * rather than "loading" specifically when there's no real fetch in progress, so consumers don't need
 * to separately work out whether to show a loading spinner.
 */
export function computeQueryDependenciesState(query: QueryLikeResult): PersistableAtomDependenciesState {
    if (query.isError) {
        return "error";
    }
    if (query.isFetching) {
        return "loading";
    }
    if (query.isPending) {
        return "blocked";
    }
    return "loaded";
}

/**
 * Same as {@link computeQueryDependenciesState}, for the `atomWithQueries` (one-query-per-item) case.
 */
export function computeQueriesDependenciesState(queries: QueryLikeResult[]): PersistableAtomDependenciesState {
    if (queries.some((query) => query.isError)) {
        return "error";
    }
    if (queries.some((query) => query.isFetching)) {
        return "loading";
    }
    if (queries.some((query) => query.isPending)) {
        return "blocked";
    }
    return "loaded";
}

type PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue> = {
    /**
     * The initial value for the atom before any user or persisted value is applied.
     * This is typically a safe default value used when no persisted state is present.
     */
    initialValue?: TValue;

    /**
     * A function to compare two values for equality.
     * This is used to optimize updates by preventing unnecessary re-renders.
     */
    areEqualFunction?: (a: TValue, b: TValue) => boolean;

    /**
     * A function to precompute any necessary data based on the current value. This data is then
     * passed to the isValid and fixup functions to help them make decisions.
     *
     * The options object contains:
     * - `value`: The current atom value (may be undefined)
     * - `get`: Jotai getter to read from other atoms
     *
     * Returns the precomputed value to be passed to isValidFunction and fixupFunction.
     */
    precomputeFunction: (options: { value: TValue | undefined; get: Getter }) => TPrecomputedValue;

    /**
     * An optional function to compute the dependencies state of the atom. This is used to determine
     * if the atom is waiting for dependent atoms to resolve (e.g., query atoms) before it can
     * determine its own validity.
     *
     * The options object contains:
     * - `value`: The current atom value (may be undefined)
     * - `get`: Jotai getter to read from other atoms
     * - `precomputedValue`: The precomputed value from precomputeFunction
     *
     * Returns:
     * - "loading": Dependencies are being resolved
     * - "error": One or more dependencies have an error
     * - "loaded": All dependencies are ready
     *
     * If not provided, the dependencies state is assumed to be "loaded".
     */
    computeDependenciesState?: (options: {
        value: TValue | undefined;
        get: Getter;
        precomputedValue: TPrecomputedValue;
    }) => PersistableAtomDependenciesState;

    /**
     * A function to validate whether the given value is valid in the current application context.
     * Called whenever the atom is read to determine if a persisted value is still valid.
     * This function is also used to decide whether the fixup function should be triggered
     * for user-provided values.
     *
     * The options object contains:
     * - `value`: The current atom value to validate
     * - `get`: Jotai getter to read from other atoms
     * - `precomputedValue`: The precomputed value from precomputeFunction
     *
     * Returns true if the value is valid in the current context, false otherwise.
     */
    isValidFunction: (options: { value: TValue; get: Getter; precomputedValue: TPrecomputedValue }) => boolean;

    /**
     * A function that provides a fallback value when a user-provided value is invalid.
     * This function is only called if the value originates from a user interaction and is invalid.
     * Persisted values are never passed to this function.
     *
     * The options object contains:
     * - `value`: The current invalid value that needs fixing (may be undefined)
     * - `get`: Jotai getter to read from other atoms
     * - `precomputedValue`: The precomputed value from precomputeFunction
     *
     * Returns a valid fallback value to use instead.
     */
    fixupFunction: (options: { value: TValue | undefined; get: Getter; precomputedValue: TPrecomputedValue }) => TValue;
};

type PersistableFixableAtomOptionsWithoutPrecompute<TValue> = {
    /**
     * The initial value for the atom before any user or persisted value is applied.
     * This is typically a safe default value used when no persisted state is present.
     */
    initialValue: TValue;

    /**
     * A function to compare two values for equality.
     * This is used to optimize updates by preventing unnecessary re-renders.
     */
    areEqualFunction?: (a: TValue, b: TValue) => boolean;

    /**
     * An optional function to compute the dependencies state of the atom. This is used to determine
     * if the atom is waiting for dependent atoms to resolve (e.g., query atoms) before it can
     * determine its own validity.
     *
     * The options object contains:
     * - `value`: The current atom value (may be undefined)
     * - `get`: Jotai getter to read from other atoms
     *
     * Returns:
     * - "loading": Dependencies are being resolved
     * - "error": One or more dependencies have an error
     * - "loaded": All dependencies are ready
     *
     * If not provided, the dependencies state is assumed to be "loaded".
     */
    computeDependenciesState?: (options: {
        value: TValue | undefined;
        get: Getter;
    }) => PersistableAtomDependenciesState;

    /**
     * A function to validate whether the given value is valid in the current application context.
     * Called whenever the atom is read to determine if a persisted value is still valid.
     * This function is also used to decide whether the fixup function should be triggered
     * for user-provided values.
     *
     * The options object contains:
     * - `value`: The current atom value to validate
     * - `get`: Jotai getter to read from other atoms
     *
     * Returns true if the value is valid in the current context, false otherwise.
     */
    isValidFunction: (options: { value: TValue; get: Getter }) => boolean;

    /**
     * A function that provides a fallback value when a user-provided value is invalid.
     * This function is only called if the value originates from a user interaction and is invalid.
     * Persisted values are never passed to this function.
     *
     * The options object contains:
     * - `value`: The current invalid value that needs fixing (may be undefined)
     * - `get`: Jotai getter to read from other atoms
     *
     * Returns a valid fallback value to use instead.
     */
    fixupFunction: (options: { value: TValue | undefined; get: Getter }) => TValue;
};

export type PersistableFixableAtomOptions<TValue, TPrecomputedValue = unknown> =
    | PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue>
    | PersistableFixableAtomOptionsWithoutPrecompute<TValue>;

const PERSISTABLE_ATOM = Symbol("persistableAtom");

/**
 * Write-only sentinel used to imperatively trigger a fixup of a persistableFixableAtom's *current*
 * value, regardless of its source (`set(atom, FIXUP)` / `useSetAtom(atom)(FIXUP)`).
 *
 * This is added as a third accepted variant of the atom's existing write-argument union rather than
 * as a second atom / tuple return, so that existing `useAtomValue`/`useSetAtom`/`get`/`set` call sites
 * - which only ever pass or expect a bare TValue or a PersistableAtomState<TValue> - keep compiling
 * and behaving unchanged.
 */
export const FIXUP = Symbol("persistableFixableAtom.FIXUP");
type FixupCommand = typeof FIXUP;

export type PersistableFixableRead<TValue> = {
    value: TValue;
    isValidInContext: boolean;
    isLoading: boolean;
    isBlocked: boolean;
    depsHaveError: boolean;
    _source: Source;
};

/** Alias for the atom type returned by `persistableFixableAtom`. */
export type PersistableFixableAtom<TValue = any> = WritableAtom<
    PersistableFixableRead<TValue>,
    [TValue | PersistableAtomState<TValue> | FixupCommand],
    void
>;

export function persistableFixableAtom<TValue, TPrecomputedValue>(
    options: PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue>,
): PersistableFixableAtom<TValue>;

export function persistableFixableAtom<TValue>(
    options: PersistableFixableAtomOptionsWithoutPrecompute<TValue>,
): PersistableFixableAtom<TValue>;

export function persistableFixableAtom<TValue, TPrecomputedValue>(
    options: PersistableFixableAtomOptions<TValue, TPrecomputedValue>,
): PersistableFixableAtom<TValue> {
    const internalStateAtom = atom<PersistableAtomState<TValue | undefined>>({
        value: options.initialValue,
        _source: Source.USER,
    });

    // One-way latch: becomes true the first time this atom's dependencies have resolved at least once
    // (computeDependenciesState reports "loaded", or immediately if that callback wasn't given). While false, a USER-sourced value is masked on every read exactly as before this
    // change, so a freshly-mounted atom still lands on a sensible default instead of flashing
    // "invalid" while its dependencies are still loading for the first time. Once true, masking stops
    // for good for USER-sourced values: an invalid value is kept as-is and reported as invalid via
    // isValidInContext, instead of being silently replaced on every read.
    const settledAtom = atom<boolean>(false);

    const hasPrecompute = (
        opts: PersistableFixableAtomOptions<TValue, TPrecomputedValue>,
    ): opts is PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue> =>
        (opts as PersistableFixableAtomOptionsWithPrecompute<TValue, TPrecomputedValue>).precomputeFunction !==
        undefined;

    // Computes dependenciesState + isValid + a lazy fixup thunk in one pass, calling
    // precomputeFunction at most once. Shared by the read function, the FIXUP write branch, and the
    // lifecycle effect below.
    function deriveState(
        get: Getter,
        value: TValue | undefined,
    ): { dependenciesState: PersistableAtomDependenciesState; isValid: boolean; computeFixup: () => TValue } {
        if (hasPrecompute(options)) {
            const precomputedValue = options.precomputeFunction({ value, get });
            const dependenciesState = options.computeDependenciesState
                ? options.computeDependenciesState({ value, get, precomputedValue })
                : "loaded";
            const isValid = value !== undefined && options.isValidFunction({ value, get, precomputedValue });
            return {
                dependenciesState,
                isValid,
                computeFixup: () => options.fixupFunction({ value, get, precomputedValue }),
            };
        }

        const dependenciesState = options.computeDependenciesState
            ? options.computeDependenciesState({ value, get })
            : "loaded";
        const isValid = value !== undefined && options.isValidFunction({ value, get });
        return {
            dependenciesState,
            isValid,
            computeFixup: () => options.fixupFunction({ value, get }),
        };
    }

    const fixableAtom = atom<
        PersistableFixableRead<TValue>,
        [TValue | PersistableAtomState<TValue> | FixupCommand],
        void
    >(
        (get) => {
            const internalState = get(internalStateAtom);
            const settled = get(settledAtom);
            const { dependenciesState, isValid, computeFixup } = deriveState(get, internalState.value);
            const isLoading = dependenciesState === "loading";
            const isBlocked = dependenciesState === "blocked";
            const depsHaveError = dependenciesState === "error";

            if (internalState._source === Source.PERSISTENCE || internalState._source === Source.TEMPLATE) {
                if (internalState.value === undefined) {
                    throw new Error("Persisted or template value cannot be undefined.");
                }
                return {
                    value: internalState.value,
                    isValidInContext: isValid,
                    isLoading,
                    isBlocked,
                    depsHaveError,
                    _source: internalState._source,
                };
            }

            // Source.USER
            if (!settled) {
                return {
                    value: isValid ? (internalState.value as TValue) : computeFixup(),
                    isValidInContext: true,
                    isLoading,
                    isBlocked,
                    depsHaveError,
                    _source: internalState._source,
                };
            }

            // Settled: masking stops for good - keep an invalid value as-is and report its real
            // validity instead of silently replacing it.
            return {
                value: internalState.value as TValue,
                isValidInContext: isValid,
                isLoading,
                isBlocked,
                depsHaveError,
                _source: internalState._source,
            };
        },
        (get, set, update) => {
            if (update === FIXUP) {
                // Manual-repair path: not gated on `settled`. Works for USER-, PERSISTENCE- and
                // TEMPLATE-sourced values alike; a repaired value is always written back as USER, since
                // it's no longer really "the persisted/template value."
                const internalState = get(internalStateAtom);
                const { dependenciesState, isValid, computeFixup } = deriveState(get, internalState.value);
                if (dependenciesState !== "loaded" || isValid) {
                    // Nothing meaningful to fix up against yet, or already valid.
                    return;
                }
                set(internalStateAtom, { value: computeFixup(), _source: Source.USER });
                set(settledAtom, true);
                return;
            }

            const areEqualFunc = options.areEqualFunction;
            const currentState = get(internalStateAtom);

            if (isInternalState(update)) {
                if (
                    currentState.value !== undefined &&
                    areEqualFunc &&
                    areEqualFunc(currentState.value, update.value)
                ) {
                    // If values are equal, preserve value reference, but update source if different
                    if (currentState._source !== update._source) {
                        set(internalStateAtom, { value: currentState.value, _source: update._source });
                    }
                    return;
                }
                set(internalStateAtom, { ...update });
                return;
            }

            // Handle direct value updates (non-internal state)
            const value =
                currentState.value !== undefined && areEqualFunc && areEqualFunc(currentState.value, update)
                    ? currentState.value // Preserve reference when equal
                    : update;
            set(internalStateAtom, { value, _source: Source.USER });
        },
    );

    // Single lifecycle effect handling both: (a) the one-way "settled" latch (new), and (b) the
    // pre-existing PERSISTENCE/TEMPLATE -> USER promotion once valid. Kept as one effect since both
    // branches read the same get(fixableAtom)/get(internalStateAtom) snapshot and both defer their
    // `set` calls to the same microtask, so a consumer can never observe settledAtom === true without
    // the corresponding fixed-up internal value already in place.
    const lifecycleEffect = atomEffect((get, set) => {
        const currentRead = get(fixableAtom);
        const dependenciesResolved = !currentRead.isLoading && !currentRead.isBlocked && !currentRead.depsHaveError;

        if (!dependenciesResolved) {
            return;
        }

        // Defer to a microtask (to avoid synchronous state updates while this effect is itself being
        // (re-)triggered as part of a get(fixableAtom) read chain), and - critically - re-derive
        // everything from a FRESH read at that point rather than trusting this synchronous pass's
        // snapshot. Another write (e.g. a deserialize write racing with this atom's first
        // mount/subscribe, which can happen in either order depending on the caller) can land in the
        // gap between this effect running and the microtask firing; using a stale snapshot there would
        // silently overwrite whatever landed in that gap with outdated data.
        queueMicrotask(() => {
            const settled = get(settledAtom);
            const internalState = get(internalStateAtom);
            const { dependenciesState, isValid, computeFixup } = deriveState(get, internalState.value);
            if (dependenciesState !== "loaded") {
                // Dependencies regressed (or failed) since this was queued - nothing to do now, a
                // future successful resolution of the (now-changed) dependency will re-trigger this
                // effect.
                return;
            }

            if (!settled && internalState._source === Source.USER && !isValid) {
                set(internalStateAtom, { value: computeFixup(), _source: Source.USER });
            } else if (
                (internalState._source === Source.PERSISTENCE || internalState._source === Source.TEMPLATE) &&
                isValid
            ) {
                set(internalStateAtom, { value: internalState.value, _source: Source.USER });
            }

            if (!settled) {
                set(settledAtom, true);
            }
        });
    });

    // Wrap the atom to automatically mount the effect
    const atomWithEffect = atom(
        (get) => {
            get(lifecycleEffect); // Subscribe to effect
            return get(fixableAtom);
        },
        (_get, set, update: TValue | PersistableAtomState<TValue> | FixupCommand) => {
            set(fixableAtom, update);
        },
    );

    Object.defineProperty(atomWithEffect, PERSISTABLE_ATOM, {
        value: true,
        enumerable: false,
    });

    return atomWithEffect;
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
