import React from "react";

import { isEqual } from "lodash";

export type StateBaseType = object;
export type StateOptions<T extends StateBaseType> = {
    [K in keyof T]?: {
        deepCompare?: boolean;
    };
};

export class StateStore<StateType extends StateBaseType> {
    private _state: Record<keyof StateType, any>;
    private _options?: StateOptions<StateType>;
    private _subscribersMap: Partial<Record<keyof StateType, Set<any>>>;

    constructor(defaultState: StateType, options?: StateOptions<StateType>) {
        this._state = defaultState;
        this._subscribersMap = {};
        this._options = options;
    }

    hasKey(key: keyof StateType): boolean {
        return key in this._state;
    }

    getValue<K extends keyof StateType>(key: K): StateType[K] {
        return this._state[key];
    }

    setValue<K extends keyof StateType>(key: K, value: StateType[K]) {
        if (this._state[key] === value) {
            return;
        }

        if (this._options && this._options[key]?.deepCompare) {
            if (isEqual(value, this._state[key])) {
                return;
            }
        }

        this._state[key] = value;
        const subscribersSet = this._subscribersMap[key] || new Set();
        for (const cb of subscribersSet) {
            cb(value);
        }
    }

    subscribe<K extends keyof StateType>(key: K, cb: (value: StateType[K]) => void) {
        const subscribersSet = this._subscribersMap[key] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[key] = subscribersSet;

        // Trigger the callback immediately in case we have some late subscribers
        cb(this._state[key]);

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
    }, [key, stateStore]);

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
