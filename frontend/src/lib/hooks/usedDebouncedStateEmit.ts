import React from "react";

import { debounce } from "lodash";
import type { DebouncedFunc } from "lodash";

type DebounceFuncInteractions = Pick<DebouncedFunc<() => void>, "cancel" | "flush">;

/**
 * Creates a debounced onChange handler that also keeps an internal value in sync with the external value.
 * This is useful for cases where you want to update the UI immediately on change, but debounce the actual change event (such as for sliders or text inputs).
 * @param externalValue The externally controlled value. If this changes, the internal value will be immediately updated to match.
 * @param onValueChange Callback that is called after the debounce delay each time the internal value changes.
 * @param debounceTimeMs The wait time used when debouncing. If 0 or undefined, no debounce will occur.
 * @returns A tuple with the immediately updated internal value, a setter, and a utility object that can cancel and flush the debounced function
 */
export function useDebouncedOnChange<TValue>(
    externalValue: TValue,
    onValueChange?: (newValue: TValue) => void,
    debounceTimeMs?: number,
): [internalValue: typeof externalValue, setValue: (value: TValue) => void, debounceFlusher: DebounceFuncInteractions] {
    const [internalValue, setInternalValue] = React.useState(externalValue);
    const [previousExternalValue, setPreviousExternalValue] = React.useState(externalValue);

    const debouncedCallback = useDebouncedFunction((value: TValue) => {
        onValueChange?.(value);
    }, debounceTimeMs ?? 0);

    const setValue = React.useCallback(
        function setValue(value: TValue) {
            setInternalValue(value);
            debouncedCallback(value);
        },
        [debouncedCallback],
    );

    if (previousExternalValue !== externalValue) {
        setPreviousExternalValue(externalValue);
        setInternalValue(externalValue);
        debouncedCallback.cancel();
    }

    return [internalValue, setValue, debouncedCallback];
}

/**
 * Wraps a function in a lodash debouncer. Creates a stable function reference, similar to React.useCallback
 * @param callback Function to fire after debounce. The debounced function is *not* recreated when this changes.
 * @param waitMs The amount of time to wait when debouncing. Changing this recreates the debounce function
 * @returns A stable debounced version of `callback`
 */
export function useDebouncedFunction<TArgs extends any[]>(
    callback: (...args: TArgs) => void,
    waitMs: number,
): DebouncedFunc<typeof callback> {
    // Wrap the actual debouncer to get a stable refference. Only recreated if delay changes
    const debouncedCallback = React.useMemo(
        () =>
            debounce((...args: TArgs) => callback(...args), waitMs, {
                // If leading is false, a delay of zero will defer the change by one tick, which is unwanted
                leading: waitMs === 0,
            }),
        // To simplify developer flow we want to allow unstable function refs (such as arrow functions).
        // Because of this, we need to explicitly ignore the callback itself.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [waitMs],
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
