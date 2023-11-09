import React from "react";

export function useValidState<T>(options: {
    initialState: T | (() => T);
    validStates: readonly T[];
    keepStateWhenInvalid?: boolean;
}): [T, (newState: T | ((prevState: T) => T), acceptInvalidState?: boolean) => void];

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

    if (options.validateStateFunc !== undefined) {
        if (!options.validateStateFunc(state)) {
            validState = computedInitialState;
            if (!options.keepStateWhenInvalid) {
                setState(validState);
            }
        }

        const validatingFunc = options.validateStateFunc;

        function setValidState(newState: T | ((prevState: T) => T), acceptInvalidState = true) {
            const computedNewState =
                typeof newState === "function" ? (newState as (prevState: T) => T)(state) : newState;
            if (!acceptInvalidState && !validatingFunc(computedNewState)) {
                return;
            }

            setState(newState);
        }

        return [validState, setValidState];
    }

    if (options.validStates === undefined) {
        throw new Error("validStates must be provided");
    }

    if (!options.validStates.includes(state)) {
        if (options.validStates.length > 0) {
            validState = options.validStates[0];
        } else {
            validState = computedInitialState;
        }
        if (!options.keepStateWhenInvalid && state !== validState) {
            setState(validState);
        }
    }

    const validStates = options.validStates;

    function setValidState(newState: T | ((prevState: T) => T), acceptInvalidState = true) {
        const computedNewState = typeof newState === "function" ? (newState as (prevState: T) => T)(state) : newState;
        if (!acceptInvalidState && !validStates.includes(computedNewState)) {
            return;
        }

        setState(newState);
    }

    return [validState, setValidState];
}
