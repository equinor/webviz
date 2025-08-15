import React from "react";

export function useOptInControlledValue<TValue>(
    initialValue: TValue,
    controlledProp: TValue | undefined,
    onValueChange?: (newValue: TValue) => void,
): [TValue, (newValue: TValue) => void] {
    const useLocalValue = controlledProp === undefined;

    const [localValue, setLocalValue] = React.useState<TValue>(initialValue);

    const value = useLocalValue ? localValue : controlledProp;
    const setValue = React.useCallback(
        function setValue(newValue: TValue) {
            if (useLocalValue) setLocalValue(newValue);
            onValueChange?.(newValue);
        },
        [useLocalValue, onValueChange],
    );

    return [value, setValue];
}
