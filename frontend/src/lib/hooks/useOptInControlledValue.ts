import React from "react";

/**
 * Creates a stateful value that becomes controlled/uncontrolled, similar to how React handles values for native inputs. In short,
 * @param initialValue Initial value for the state. Overriden if `controlledValue` is defined, but still required for clarity
 * @param controlledValue An externally controlled value. If this is `undefined`, we consider the state "uncontrolled".
 * @param onValueChange Callback that is called any time the value is set
 * @returns A tuple with the current state value and setter function
 */
export function useOptInControlledValue<TValue>(
    initialValue: TValue,
    controlledValue: TValue | undefined,
    onValueChange?: (newValue: TValue) => void,
): [TValue, (newValue: TValue) => void] {
    const [localValue, setLocalValue] = React.useState<TValue>(initialValue);

    const isControlled = controlledValue !== undefined;

    const value = isControlled ? controlledValue : localValue;

    const setValue = React.useCallback(
        function setValue(newValue: TValue) {
            if (isControlled) onValueChange?.(newValue);
            setLocalValue(newValue);
        },
        [isControlled, onValueChange],
    );

    return [value, setValue];
}
