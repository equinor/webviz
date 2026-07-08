import React from "react";

type ContextValue = { openCount: number; increment: () => void; decrement: () => void };

export const AlertDialogNestingContext = React.createContext<ContextValue>({
    openCount: 0,
    increment: function noopIncrement() {},
    decrement: function noopDecrement() {},
});

export function AlertDialogNestingProvider({ children }: { children: React.ReactNode }) {
    const [openCount, setOpenCount] = React.useState(0);
    const increment = React.useCallback(function increment() {
        setOpenCount((n) => n + 1);
    }, []);
    const decrement = React.useCallback(function decrement() {
        setOpenCount((n) => Math.max(0, n - 1));
    }, []);
    return (
        <AlertDialogNestingContext.Provider value={{ openCount, increment, decrement }}>
            {children}
        </AlertDialogNestingContext.Provider>
    );
}
