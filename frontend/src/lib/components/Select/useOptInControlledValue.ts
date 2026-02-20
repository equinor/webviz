import React from "react";

import { debounce } from "lodash";

/**
 * Creates a stateful value that can be either controlled or uncontrolled, with optional debounced updates
 * @param initialValue The initial value. Overridden if `controlledProp` is provided
 * @param controlledProp An externally controlled value. If `undefined`, the returned value is considered uncontrolled
 * @param onValueChange An optional callback that is called whenever the value changes
 * @param debounceTimeMs Debounce time for onValueChange calls. Note that the internal value is updated immediately. Defaults to 0
 * @returns
 */
export function useOptInControlledValue<TValue>(
    initialValue: TValue,
    controlledProp: TValue | undefined,
    onValueChange?: (newValue: TValue) => void,
    debounceTimeMs = 0,
) {
    // Debounced callback
    const debouncedOnValueChange = useDebouncedFunction((newValue: TValue) => {
        setDebouncedLocalValue(newValue);
        onValueChange?.(newValue);
    }, debounceTimeMs);

    const [localValue, setLocalValue] = React.useState<TValue>(
        controlledProp !== undefined ? controlledProp : initialValue,
    );

    // Keep track of a debounced copy of local value; useful for comparing to
    // controlledProp during debounces
    const [debouncedLocalValue, setDebouncedLocalValue] = React.useState<TValue>(initialValue);

    // Update local value if the controlled value changes. Note that if debounce
    // is enabled, there is period where controlledProp remains as the old value,
    // while the local value is changed, which is why we compare to a debounced
    // local value. If the controlled prop is a brand new value, it was changed
    // externally, and we can update immediately
    if (controlledProp !== undefined && controlledProp !== debouncedLocalValue) {
        setLocalValue(controlledProp);
        setDebouncedLocalValue(controlledProp);

        debouncedOnValueChange.cancel();
    }

    const setValue = React.useCallback(
        function setValue(newValue: TValue) {
            setLocalValue(newValue);

            debouncedOnValueChange(newValue);
        },
        [debouncedOnValueChange],
    );

    return [
        localValue,
        setValue,
        // Allow hook users to flush and cancel the debounce, but not directly call it
        // (just softly enforced via type)
        debouncedOnValueChange as Pick<typeof debouncedOnValueChange, "flush" | "cancel">,
    ] as const;
}

// Lodash debounce wrapper to retain a stable reference
function useDebouncedFunction<TArgs extends any[]>(callback: (...args: TArgs) => void, delayMs: number) {
    // Store the callback in a ref so we don't lose debouncer if callback changes
    const callbackRef = React.useRef<(...args: TArgs) => void>();
    callbackRef.current = callback;

    // Only wrap the actual debouncer. Only recreated if delay changes
    const debouncedCallback = React.useMemo(
        () => debounce((...args: TArgs) => callbackRef.current?.(...args), delayMs),
        [delayMs],
    );

    // Cancel any pending debounce if component unmounts
    React.useEffect(
        function handleMount() {
            return function handleUnmount() {
                debouncedCallback.cancel();
            };
        },
        [debouncedCallback],
    );

    return debouncedCallback;
}
