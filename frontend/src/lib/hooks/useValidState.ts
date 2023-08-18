import React from "react";

export function useValidState<T>(
    initialState: T,
    validStates: T[],
    keepStateWhenInvalid = true
): [T, (value: T) => void] {
    const [state, setState] = React.useState<T>(initialState);

    let adjustedState = state;

    if (!validStates.includes(state)) {
        if (validStates.length > 0) {
            adjustedState = validStates[0];
        } else {
            adjustedState = initialState;
        }
        if (!keepStateWhenInvalid) {
            setState(adjustedState);
        }
    }

    return [adjustedState, setState];
}
