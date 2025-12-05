import React from "react";

/**
 * Computes an list scroll value (possibly a float) so that the new value ensures that the focused item remains in view
 * @param focusedItemIndex The item index to "focus" on
 * @param viewSize The amount of items visible within the view. Can be a float.
 * @returns The offset the view should start at to keep `focusedItemIndex` in view. Can be a float
 */
export function useKeepFocusedListItemInView(focusedItemIndex: number, viewSize: number) {
    const [scrollStartIndex, setScrollStartIndex] = React.useState(0);
    const [prevFocusedIndex, setPrevFocusedIndex] = React.useState(-1);

    if (focusedItemIndex !== prevFocusedIndex) {
        setPrevFocusedIndex(focusedItemIndex);

        if (focusedItemIndex < scrollStartIndex) {
            setScrollStartIndex(focusedItemIndex);
        } else if (focusedItemIndex > scrollStartIndex + viewSize - 1) {
            setScrollStartIndex(Math.max(0, focusedItemIndex - viewSize + 1));
        }
    }

    return [scrollStartIndex, setScrollStartIndex] as const;
}
