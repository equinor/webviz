import React from "react";

export function useDebouncedStateEmit<TValue>(
    value: TValue,
    onValueChange?: (newValue: TValue) => void,
    debounceTimeMs?: number,
): [internalValue: typeof value, debouncedOnChange: typeof onValueChange, debounceFlusher: () => void] {
    if (value === undefined) {
        console.warn("useDebouncedStateEmit called on uncontrolled value. This should be avoided.");
    }

    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const [prevValue, setPrevValue] = React.useState(value);
    const [internalValue, setInternalValue] = React.useState(value);

    if (prevValue !== value) {
        setPrevValue(value);
        if (internalValue !== value) {
            setInternalValue(value);
        }
    }

    React.useEffect(function handleMount() {
        return function handleUnmount() {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const debouncedOnChangeCallback = React.useCallback(
        function debouncedOnChangeCallback(newValue: TValue) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

            setInternalValue(newValue);

            if (!debounceTimeMs) {
                onValueChange?.(newValue);
            } else if (onValueChange) {
                debounceTimerRef.current = setTimeout(() => {
                    onValueChange(newValue);

                    debounceTimerRef.current = null;
                }, debounceTimeMs);
            }
        },
        [debounceTimeMs, onValueChange],
    );

    const flushDebouncedFunc = React.useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);

            debounceTimerRef.current = null;
            onValueChange?.(internalValue);
        }
    }, [internalValue, onValueChange]);

    return [internalValue, debouncedOnChangeCallback, flushDebouncedFunc];
}

export function useOnScreenChangeHandler(ref: React.RefObject<HTMLElement>, callback: (isOnScreen: boolean) => void) {
    React.useEffect(
        function setupObserverEffect() {
            const observer = new IntersectionObserver(([entry]) => {
                callback(entry.isIntersecting);
            });

            if (ref.current) observer.observe(ref.current);
            return () => observer.disconnect();
        },
        [callback, ref],
    );
}
