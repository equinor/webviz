import React from "react";

export function useValidState<T>(
    defaultValue: T,
    validValues: T[],
    keepStateWhenInvalid = false
): [T, (value: T) => void] {
    const [value, setValue] = React.useState<T>(defaultValue);

    let adjustedValue = value;

    if (!validValues.includes(value)) {
        if (validValues.length > 0) {
            adjustedValue = validValues[0];
        } else {
            adjustedValue = defaultValue;
        }
        if (!keepStateWhenInvalid) {
            setValue(adjustedValue);
        }
    }

    return [adjustedValue, setValue];
}
