import React from "react";

import { isEqual } from "lodash";

export function useValidState<T, K = any>(
    initialState: T | (() => T),
    validStates: readonly T[] | [readonly K[], (element: K) => T],
    keepStateWhenInvalid = true
): [T, (newState: T | ((prevState: T) => T), acceptInvalidState?: boolean) => void] {
    const [state, setState] = React.useState<T>(initialState);
    const [adjustedValidStates, setAdjustedValidStates] = React.useState<T[]>([]);

    let validState = state;
    const computedInitialState = typeof initialState === "function" ? (initialState as () => T)() : initialState;

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
        if (!keepStateWhenInvalid) {
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
