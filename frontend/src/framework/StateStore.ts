import React from "react";

export type StateBaseType = object;

export class StateStore<StateType extends StateBaseType> {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    private _state: Record<keyof StateType, any>;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    private _subscribersMap: Partial<Record<keyof StateType, Set<any>>>;

    constructor(initialState: StateType) {
        this._state = initialState;
        this._subscribersMap = {};
    }

    public hasKey(key: keyof StateType): boolean {
        return key in this._state;
    }

    public getValue<K extends keyof StateType>(key: K): StateType[K] {
        return this._state[key];
    }

    public setValue<K extends keyof StateType>(key: K, value: StateType[K]) {
        this._state[key] = value;
        const subscribersSet = this._subscribersMap[key] || new Set();
        for (const cb of subscribersSet) {
            cb(value);
        }
    }

    public subscribe<K extends keyof StateType>(key: K, cb: (value: StateType[K]) => void) {
        const subscribersSet = this._subscribersMap[key] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[key] = subscribersSet;
        return () => {
            subscribersSet.delete(cb);
        };
    }
}

export function useStoreState<T extends keyof S, S extends StateBaseType>(
    stateStore: StateStore<S>,
    key: T
): [S[T], (value: S[T] | ((prev: S[T]) => S[T])) => void] {
    const [state, setState] = React.useState<S[T]>(stateStore.getValue(key));

    React.useEffect(() => {
        const handleStateChange = (value: S[T]) => {
            setState(value);
        };

        const unsubscribeFunc = stateStore.subscribe(key, handleStateChange);

        return unsubscribeFunc;
    }, [key]);

    function setter(valueOrFunc: S[T] | ((prev: S[T]) => S[T])): void {
        if (valueOrFunc instanceof Function) {
            stateStore.setValue(key, valueOrFunc(state));
            return;
        }
        stateStore.setValue(key, valueOrFunc);
    }

    return [state, setter];
}

export function useStoreValue<T extends keyof S, S extends StateBaseType>(stateStore: StateStore<S>, key: T): S[T] {
    const [state] = useStoreState(stateStore, key);
    return state;
}

export function useSetStoreValue<T extends keyof S, S extends StateBaseType>(
    stateStore: StateStore<S>,
    key: T
): (value: S[T] | ((prev: S[T]) => S[T])) => void {
    const [, setter] = useStoreState(stateStore, key);
    return setter;
}
