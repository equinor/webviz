import React from "react";

export function useValidState<T, K = any>(
    initialState: T | (() => T),
    validStates: readonly T[] | [readonly K[], (element: K) => T],
    keepStateWhenInvalid = true
): [T, (newState: T | ((prevState: T) => T), acceptInvalidState?: boolean) => void] {
    const [state, setState] = React.useState<T>(initialState);

    let validState = state;
    const computedInitialState = typeof initialState === "function" ? (initialState as () => T)() : initialState;

    let adjustedValidStates: T[] = [];
    if (validStates.length === 2 && Array.isArray(validStates[0]) && typeof validStates[1] === "function") {
        adjustedValidStates = validStates[0].map(validStates[1] as (element: K) => T);
    } else {
        adjustedValidStates = validStates as T[];
    }

    if (!adjustedValidStates.includes(state)) {
        if (validStates.length > 0) {
            validState = adjustedValidStates[0];
        } else {
            validState = computedInitialState;
        }
        if (!keepStateWhenInvalid) {
            setState(validState);
        }
    }

    function setValidState(newState: T | ((prevState: T) => T), acceptInvalidState = true) {
        const computedNewState = typeof newState === "function" ? (newState as (prevState: T) => T)(state) : newState;
        if (!acceptInvalidState && !adjustedValidStates.includes(computedNewState)) {
            return;
        }

        setState(newState);
    }

    return [validState, setValidState];
}
