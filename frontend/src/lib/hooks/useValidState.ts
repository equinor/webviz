import React from "react";

export function useValidState<T>(
    initialState: T,
    validStates: T[],
    keepStateWhenInvalid = false
): [T, (value: T) => void] {
    const [value, setValue] = React.useState<T>(initialState);

    let adjustedValue = value;

    if (!validStates.includes(value)) {
        if (validStates.length > 0) {
            adjustedValue = validStates[0];
        } else {
            adjustedValue = initialState;
        }
        if (!keepStateWhenInvalid) {
            setValue(adjustedValue);
        }
    }

    return [adjustedValue, setValue];
}
