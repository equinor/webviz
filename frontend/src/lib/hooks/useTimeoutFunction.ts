import React from "react";

export function useTimeoutFunction(): (timeoutFunction: () => void, delay: number) => void {
    const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(function onMountEffect() {
        const timeoutRefCurrent = timeoutRef.current;
        return () => {
            if (timeoutRefCurrent) {
                clearTimeout(timeoutRefCurrent);
            }
        };
    }, []);

    return (timeoutFunction: () => void, delay: number) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            timeoutFunction();
            timeoutRef.current = null;
        }, delay);
    };
}
