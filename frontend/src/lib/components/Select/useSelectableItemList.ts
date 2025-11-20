import React from "react";

import { difference, isEqual } from "lodash";
import { Key } from "ts-key-enum";

/**
 * Generic interface for any "selectable" item
 */
export interface SelectableItem<TValue> {
    value: TValue;
    disabled?: boolean;
}

type UseSelectableItemListArgs<TValue> = {
    /** The html-element to attach the keyboard events to */
    listElementRef: React.RefObject<HTMLElement>;
    /** The currently selected items */
    selectedValues: TValue[];
    /** The available items to select from  */
    items: SelectableItem<TValue>[];
    /** The amount of items per "page". Decides how far page-down/up will move  */
    pageSize: number;
    /** Whether selecting multiple items is allowed */
    multiple: boolean;
    /** Callback for when the value changes */
    onSelectionChange: (values: TValue[]) => void;
};

/**
 * Sets up keyboard navigation and selection for a list of selectable items.
 * @param args Arguments for the hook. See `UseSelectableItemListArgs`
 * @returns The index of the currently focused item, and a setter to change it programmatically
 */
export function useSelectableItemList<TValue>({
    selectedValues,
    listElementRef,
    items,
    pageSize,
    multiple,
    onSelectionChange,
}: UseSelectableItemListArgs<TValue>) {
    // Store a copy to track external changes
    const [prevSelectedValues, setPrevSelectedValues] = React.useState(selectedValues);
    const [currentFocusIndex, setCurrentFocusIndex] = React.useState<number>(-1);
    const [selectionAnchorIndex, setSelectionAnchorIndex] = React.useState<number | null>(null);

    if (!isEqual(selectedValues, prevSelectedValues)) {
        setPrevSelectedValues(selectedValues);

        const addedItems = difference(selectedValues, prevSelectedValues);

        if (addedItems.length) {
            // Focus on one of the added items (In most all cases, only a single item has changed)
            const newFocusIndex = items.findIndex((i) => i.value === addedItems.at(-1)!);
            setCurrentFocusIndex(newFocusIndex);
        } else {
            const newFocusIndex = items.findIndex((i) => i.value === selectedValues.at(-1)!);
            setCurrentFocusIndex(newFocusIndex);
        }
    }

    const storeAndEmitNewSelection = React.useCallback(
        function storeAndEmitNewSelection(newValues: TValue[]) {
            setPrevSelectedValues(newValues);
            onSelectionChange(newValues);
        },
        [onSelectionChange],
    );

    React.useEffect(
        function addKeyboardListenersEffect() {
            const refCurrent = listElementRef.current;

            // Move the focus to a given index (or the next valid one), and select items accordingly
            // TODO: Could be nice to have mouse select use the same functions, but couldn't figure out how to neatly separate select and movement
            function moveFocusAndSelect(attemptedIndex: number, direction: number, evt: KeyboardEvent) {
                evt.preventDefault();

                // Get an index that's within range and not at a disabled item
                const nextIndex = ensureNextValidIndexRecursively(items, attemptedIndex, direction);

                if (nextIndex === currentFocusIndex) {
                    // ? This implies we hit the end of list. There might be disabled items above
                    // ? or below. Should we nudge the scroll container to show them? This is not
                    // ? part of the native element. If we want this, the hooks need to be merged
                    return;
                }

                setCurrentFocusIndex(nextIndex);

                // Movement while ctrl is held should only moves the focus; selection is done with space-bar
                if (multiple && evt.ctrlKey && !evt.shiftKey) return;
                if (!items[nextIndex] || items[nextIndex].disabled) return;

                let newSelection;

                if (multiple && evt.shiftKey) {
                    const start = Math.min(nextIndex, selectionAnchorIndex!);
                    const end = Math.max(nextIndex, selectionAnchorIndex!);

                    newSelection = items
                        .slice(start, end + 1)
                        .filter((i) => !i.disabled)
                        .map((i) => i.value);
                } else {
                    newSelection = [items[nextIndex].value];
                }

                if (!isEqual(selectedValues, newSelection)) {
                    storeAndEmitNewSelection(newSelection);
                }
            }

            // Behavior for toggling a value that focus is on (as in, moved with ctrl, and then pressed space)
            function maybeToggleFocusedValue(evt: KeyboardEvent) {
                evt.preventDefault();

                if (!multiple) return; // Toggle is not enabled in singular selects

                const focusedItem = items[currentFocusIndex];
                if (!focusedItem || focusedItem.disabled) return;

                let newSelection = [] as TValue[];

                if (selectedValues.length === 1 && selectedValues.includes(focusedItem.value)) {
                    // Only remove last item if ctrl was held
                    if (evt.ctrlKey) newSelection = [];
                    else newSelection = selectedValues;
                } else if (selectedValues.includes(focusedItem.value)) {
                    newSelection = selectedValues.filter((v) => v !== focusedItem.value);
                } else {
                    newSelection = [...selectedValues, focusedItem.value];
                }

                if (!isEqual(selectedValues, newSelection)) {
                    storeAndEmitNewSelection(newSelection);
                }
            }

            function handleKeyDown(evt: KeyboardEvent) {
                if (evt.key === Key.Shift) {
                    setSelectionAnchorIndex(currentFocusIndex);
                }

                // Toggle the current focused item.
                // Enter key is not native behavior, but I think it's more intuitive
                if (evt.key === " " || evt.key === Key.Enter) {
                    maybeToggleFocusedValue(evt);
                }

                if (evt.key === Key.Home) {
                    moveFocusAndSelect(0, -1, evt);
                }

                if (evt.key === Key.End) {
                    moveFocusAndSelect(items.length - 1, 1, evt);
                }

                let focusMove = 0;
                if (evt.key === Key.ArrowUp) focusMove = -1;
                if (evt.key === Key.ArrowDown) focusMove = 1;
                if (evt.key === Key.PageUp) focusMove = -Math.floor(pageSize);
                if (evt.key === Key.PageDown) focusMove = Math.floor(pageSize);

                if (focusMove) {
                    if (!evt.shiftKey) setSelectionAnchorIndex(null);
                    const direction = Math.sign(focusMove);

                    moveFocusAndSelect(currentFocusIndex + focusMove, direction, evt);
                }
            }

            refCurrent?.addEventListener("keydown", handleKeyDown);
            return function removeKeyboardEventListeners() {
                refCurrent?.removeEventListener("keydown", handleKeyDown);
            };
        },
        [
            items,
            listElementRef,
            multiple,
            pageSize,
            selectedValues,
            currentFocusIndex,
            selectionAnchorIndex,
            storeAndEmitNewSelection,
        ],
    );

    return [currentFocusIndex, setCurrentFocusIndex] as const;
}

// Recursive utility to make sure index doesn't move to an illegal position (out of list or disabled item)
function ensureNextValidIndexRecursively<TValue>(
    items: SelectableItem<TValue>[],
    attemptedIndex: number,
    direction: number,
) {
    if (direction === 0) return attemptedIndex;

    if (attemptedIndex >= items.length) {
        return items.findLastIndex((i) => !i.disabled);
    }

    if (attemptedIndex < 0) {
        return items.findIndex((i) => !i.disabled);
    }

    if (items[attemptedIndex] && !items[attemptedIndex].disabled) {
        return attemptedIndex;
    }

    return ensureNextValidIndexRecursively(items, attemptedIndex + direction, direction);
}
