import React from "react";

export type HoveredSeriesReadoutInfo = {
    group: string | null;
    label: string | null;
};

export type HoveredSeriesStore = {
    getSnapshot: () => HoveredSeriesReadoutInfo | null;
    setValue: (value: HoveredSeriesReadoutInfo | null) => void;
    subscribe: (listener: () => void) => () => void;
};

export function createHoveredSeriesStore(): HoveredSeriesStore {
    let value: HoveredSeriesReadoutInfo | null = null;
    const listeners = new Set<() => void>();

    function isSameHoveredSeries(
        left: HoveredSeriesReadoutInfo | null,
        right: HoveredSeriesReadoutInfo | null,
    ): boolean {
        return left?.group === right?.group && left?.label === right?.label;
    }

    return {
        getSnapshot: () => value,
        setValue(nextValue) {
            if (isSameHoveredSeries(value, nextValue)) {
                return;
            }

            value = nextValue;
            listeners.forEach(function notifyListener(listener) {
                listener();
            });
        },
        subscribe(listener) {
            listeners.add(listener);
            return function unsubscribe() {
                listeners.delete(listener);
            };
        },
    };
}

export const HoveredSeriesReadout = React.memo(function HoveredSeriesReadout({
    store,
}: {
    store: HoveredSeriesStore;
}): React.ReactNode {
    const hoveredSeries = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

    return (
        <div>
            <span className="font-bold">Hovered Series: </span>
            {hoveredSeries?.label ?? "None"}
            {hoveredSeries?.group && ` (Group: ${hoveredSeries.group})`}
        </div>
    );
});
