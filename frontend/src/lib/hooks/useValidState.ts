import React from "react";

import { isEqual } from "lodash";

export function useValidState<T, K = any>(
    initialState: T | (() => T),
    validStates: readonly T[] | [readonly K[], (element: K) => T],
    keepStateWhenInvalid = true
): [T, (newState: T | ((prevState: T) => T), acceptInvalidState?: boolean) => void] {
    const [state, setState] = React.useState<T>(initialState);
    const [adjustedValidStates, setAdjustedValidStates] = React.useState<T[]>([]);

export function useValidState<T>(options: {
    initialState: T | (() => T);
    validateStateFunc: (state: T) => boolean;
    keepStateWhenInvalid?: boolean;
}): [T, (newState: T | ((prevState: T) => T), acceptInvalidState?: boolean) => void];

export function useValidState<T>(options: {
    initialState: T | (() => T);
    validStates?: readonly T[];
    validateStateFunc?: (state: T) => boolean;
    keepStateWhenInvalid?: boolean;
}): [T, (newState: T | ((prevState: T) => T), acceptInvalidState?: boolean) => void] {
    if (options.validStates === undefined && options.validateStateFunc === undefined) {
        throw new Error("Either validStates or validate must be provided");
    }

    if (options.validStates !== undefined && options.validateStateFunc !== undefined) {
        throw new Error("Only one of validStates or validate must be provided");
    }

    const [state, setState] = React.useState<T>(options.initialState);

    let validState = state;
    const computedInitialState =
        typeof options.initialState === "function" ? (options.initialState as () => T)() : options.initialState;

    let newAdjustedValidStates: T[] = [];
    if (validStates.length === 2 && Array.isArray(validStates[0]) && typeof validStates[1] === "function") {
        newAdjustedValidStates = validStates[0].map(validStates[1] as (element: K) => T);
    } else {
        newAdjustedValidStates = validStates as T[];
    }

    if (!newAdjustedValidStates.includes(state)) {
        if (newAdjustedValidStates.length > 0) {
            validState = newAdjustedValidStates[0];
        } else {
            validState = computedInitialState;
        }
        if (!options.keepStateWhenInvalid && state !== validState) {
            setState(validState);
        }
    }

    if (!isEqual(adjustedValidStates, newAdjustedValidStates)) {
        setAdjustedValidStates(newAdjustedValidStates);
    }

    const setValidState = React.useCallback(
        function setValidState(newState: T | ((prevState: T) => T), acceptInvalidState = true) {
            const computedNewState =
                typeof newState === "function" ? (newState as (prevState: T) => T)(state) : newState;
            if (!acceptInvalidState && !adjustedValidStates.includes(computedNewState)) {
                return;
            }

            setState(newState);
        },
        [state, adjustedValidStates]
    );

    return [validState, setValidState];
}
