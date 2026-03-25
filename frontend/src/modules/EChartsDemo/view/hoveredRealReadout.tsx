import React from "react";

export type HoveredRealInfo = {
    realization: number | null;
    ensemble: string | null;
};

export type HoveredRealStore = {
    getSnapshot: () => HoveredRealInfo | null;
    setValue: (value: HoveredRealInfo | null) => void;
    subscribe: (listener: () => void) => () => void;
};

export function createHoveredRealStore(): HoveredRealStore {
    let value: HoveredRealInfo | null = null;
    const listeners = new Set<() => void>();

    function isSameHoveredReal(left: HoveredRealInfo | null, right: HoveredRealInfo | null): boolean {
        return left?.realization === right?.realization && left?.ensemble === right?.ensemble;
    }

    return {
        getSnapshot: () => value,
        setValue(nextValue) {
            if (isSameHoveredReal(value, nextValue)) {
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

export const HoveredRealReadout = React.memo(function HoveredRealReadout({
    store,
}: {
    store: HoveredRealStore;
}): React.ReactNode {
    const hoveredReal = React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

    return (
        <div>
            <span className="font-bold">Hovered Real: </span>
            {hoveredReal?.realization ?? "None"}
            {hoveredReal?.ensemble && ` (Group: ${hoveredReal.ensemble})`}
        </div>
    );
});