import React from "react";

import { isEqual } from "lodash";

export type StateBaseType = object;
export type StateOptions<T extends StateBaseType> = {
    [K in keyof T]?: {
        deepCompare?: boolean;
        persistent?: boolean;
    };
};

export class StateStore<StateType extends StateBaseType> {
    private _id: string;
    private _state: Record<keyof StateType, any>;
    private _options?: StateOptions<StateType>;
    private _subscribersMap: Partial<Record<keyof StateType, Set<any>>>;

    constructor(id: string, initialState: StateType, options?: StateOptions<StateType>) {
        this._id = id;
        this._state = initialState;
        this._subscribersMap = {};
        this._options = options;

        this.loadFromLocalStorage();
    }

    private makeLocalStorageKey(key: keyof StateType): string {
        return `${this._id}-${String(key)}`;
    }

    private loadFromLocalStorage() {
        if (!this._options) {
            return;
        }

        for (const key in this._options) {
            if (this._options[key]?.persistent) {
                const value = localStorage.getItem(this.makeLocalStorageKey(key));
                if (value) {
                    this._state[key] = JSON.parse(value);
                }
            }
        }
    }

    private saveToLocalStorage(key: keyof StateType) {
        if (!this._options) {
            return;
        }

        if (this._options[key]?.persistent) {
            localStorage.setItem(this.makeLocalStorageKey(key), JSON.stringify(this._state[key]));
        }
    }

    public hasKey(key: keyof StateType): boolean {
        return key in this._state;
    }

    public getValue<K extends keyof StateType>(key: K): StateType[K] {
        return this._state[key];
    }

    public setValue<K extends keyof StateType>(key: K, value: StateType[K]) {
        if (this._state[key] === value) {
            return;
        }

        if (this._options && this._options[key]?.deepCompare) {
            if (isEqual(value, this._state[key])) {
                return;
            }
        }

        this._state[key] = value;

        this.saveToLocalStorage(key);

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
