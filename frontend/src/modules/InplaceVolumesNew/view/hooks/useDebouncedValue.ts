import { useEffect, useRef, useState } from "react";

/**
 * Debounces a numeric value to prevent rapid updates during animations or resizing.
 * Useful for preventing render loops when the value affects layout measurements.
 *
 * @param value - The value to debounce
 * @param delayMs - Delay in milliseconds before updating the debounced value (default: 100ms)
 * @returns The debounced value
 */
export function useDebouncedValue(value: number, delayMs: number = 100): number {
    const [debouncedValue, setDebouncedValue] = useState(value);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Clear any pending timeout
        if (timeoutRef.current !== null) {
            window.clearTimeout(timeoutRef.current);
        }

        // Set new value after a short delay
        timeoutRef.current = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);

        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delayMs]);

    return debouncedValue;
}
