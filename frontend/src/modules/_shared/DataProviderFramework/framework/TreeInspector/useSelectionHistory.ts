import React from "react";

import { isEqual } from "lodash-es";

import type { Item } from "../../interfacesAndTypes/entities";

const MAX_ENTRIES = 50;

type HistoryState = {
    entries: string[][];
    index: number;
};

export type SelectionHistory = {
    /** Records a selection made by the user - empty selections are not recorded */
    record: (ids: string[]) => void;
    /** The selection to go back / forward to, with removed items left out - null when there is none */
    backTarget: string[] | null;
    forwardTarget: string[] | null;
    goBack: () => string[] | null;
    goForward: () => string[] | null;
};

/** The entry's items that still exist, or null when none of them do. */
function getExistingIds(entry: string[], itemsById: Map<string, Item>): string[] | null {
    const ids = entry.filter((id) => itemsById.has(id));
    return ids.length > 0 ? ids : null;
}

/** The nearest entry in the given direction that still has items, skipping entries whose items were all removed. */
function findTarget(
    state: HistoryState,
    direction: -1 | 1,
    itemsById: Map<string, Item>,
): { index: number; ids: string[] } | null {
    for (let index = state.index + direction; index >= 0 && index < state.entries.length; index += direction) {
        const ids = getExistingIds(state.entries[index], itemsById);
        if (ids) {
            return { index, ids };
        }
    }
    return null;
}

/** Back / forward navigation between the selections whose settings were shown, like in a browser. */
export function useSelectionHistory(itemsById: Map<string, Item>): SelectionHistory {
    const [state, setState] = React.useState<HistoryState>({ entries: [], index: -1 });

    const record = React.useCallback(function record(ids: string[]) {
        if (ids.length === 0) {
            return;
        }
        setState((prev) => {
            if (prev.index >= 0 && isEqual(prev.entries[prev.index], ids)) {
                return prev;
            }
            // Selecting something new after going back drops the forward entries
            const entries = [...prev.entries.slice(0, prev.index + 1), ids].slice(-MAX_ENTRIES);
            return { entries, index: entries.length - 1 };
        });
    }, []);

    const back = findTarget(state, -1, itemsById);
    const forward = findTarget(state, 1, itemsById);

    function goTo(target: { index: number; ids: string[] } | null): string[] | null {
        if (!target) {
            return null;
        }
        setState((prev) => ({ ...prev, index: target.index }));
        return target.ids;
    }

    return {
        record,
        backTarget: back?.ids ?? null,
        forwardTarget: forward?.ids ?? null,
        goBack: () => goTo(back),
        goForward: () => goTo(forward),
    };
}
