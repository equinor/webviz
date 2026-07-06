import React from "react";

export enum Direction {
    Forwards,
    Backwards,
}

export type FocusableListItem = {
    focused: boolean;
    selected: boolean;
    focusMovementDirection: Direction | null;
    onFocus: () => void;
    onMoveFocus: (direction: Direction) => void;
};

export type UseListFocusOptions = {
    /**
     * Initial focused index. Defaults to -1 (no focus).
     */
    initialIndex?: number;

    /**
     * Which side of the list to start from when moving focus from no focus. Defaults to "end"
     */
    startFrom?: "start" | "end";

    /**
     * Callback when focus changes.
     */
    onFocusChange?: (index: number) => void;
};

export type UseListFocusReturn = {
    /**
     * Current focused index.
     */
    focusedIndex: number;

    /**
     * The direction of the last focus change. null if focus was set directly or cleared
     */
    direction: Direction | null;
    /**
     * Set the focused index directly. This will
     */
    setFocusedIndex: (index: number) => void;

    /** Moves the focus one step in the requested drection */
    moveFocus: (direction: Direction) => number | null;
    /**
     * Move focus to the next item.
     */
    focusNext: () => number | null;
    /**
     * Move focus to the previous item.
     */
    focusPrevious: () => number | null;
    /**
     * Move focus to a specific index.
     */
    focusItem: (index: number, asDirection?: Direction) => boolean;
    /**
     * Clear focus (set to -1).
     */
    clearFocus: () => void;
    /**
     * Check if an item is focused.
     */
    isFocused: (index: number) => boolean;
};

export function useListFocus(listLength: number, options: UseListFocusOptions = {}): UseListFocusReturn {
    const { initialIndex = -1, onFocusChange, startFrom = "end" } = options;
    const [focusedIndex, setFocusedIndexState] = React.useState(initialIndex);
    const [lastDirection, setLastDirection] = React.useState<Direction | null>(null);

    const setFocusedIndex = React.useCallback(
        (index: number) => {
            if (index >= -1 && index < listLength) {
                setFocusedIndexState((prev) => {
                    if (index === prev) return prev;

                    onFocusChange?.(index);
                    return index;
                });
            }
        },
        [listLength, onFocusChange],
    );

    const moveFocus = React.useCallback(
        (direction: Direction): number | null => {
            const step = direction === Direction.Forwards ? 1 : -1;

            let currentFocus = focusedIndex;
            if (focusedIndex === -1 && startFrom === "end") {
                currentFocus = listLength;
            }

            const newIndex = currentFocus + step;

            if (newIndex >= 0 && newIndex < listLength) {
                setFocusedIndex(newIndex);
                setLastDirection(direction);
                return newIndex;
            }
            return null;
        },
        [focusedIndex, listLength, setFocusedIndex, startFrom],
    );

    const focusNext = React.useCallback((): number | null => {
        return moveFocus(Direction.Forwards);
    }, [moveFocus]);

    const focusPrevious = React.useCallback((): number | null => {
        return moveFocus(Direction.Backwards);
    }, [moveFocus]);

    const focusItem = React.useCallback(
        (index: number, asDirection?: Direction): boolean => {
            if (index >= 0 && index < listLength) {
                setFocusedIndex(index);
                setLastDirection(asDirection ?? null);
                return true;
            }
            return false;
        },
        [listLength, setFocusedIndex],
    );

    const clearFocus = React.useCallback(() => {
        setFocusedIndex(-1);
        setLastDirection(null);
    }, [setFocusedIndex]);

    const isFocused = React.useCallback(
        (index: number): boolean => {
            return focusedIndex === index;
        },
        [focusedIndex],
    );

    return {
        direction: lastDirection,
        focusedIndex,
        moveFocus,
        setFocusedIndex,
        focusNext,
        focusPrevious,
        focusItem,
        clearFocus,
        isFocused,
    };
}
