import React from "react";

export class StateStore {
    private _state: { [key: string]: any };
    private _subscribersMap: { [key: string]: Set<any> };

    constructor() {
        this._state = {};
        this._subscribersMap = {};
    }

    public hasState(key: string): boolean {
        return key in this._state;
    }

    public getState(key: string): unknown {
        return this._state[key];
    }

    public setState(key: string, value: unknown) {
        this._state[key] = value;
        const subscribersSet = this._subscribersMap[key] || new Set();
        for (let cb of subscribersSet) {
            cb(value);
        }
    }

    subscribe(key: string, cb: (value: any) => void) {
        const subscribersSet = this._subscribersMap[key] || new Set();
        subscribersSet.add(cb);
        this._subscribersMap[key] = subscribersSet
        return () => {
            subscribersSet.delete(cb);
        }
    }
    
}



export function useStoreState<T>(stateStore: StateStore, key: string, initialState?: T): [T, (value: T | ((prev: T) => T)) => void] {
        const [state, setState] = React.useState<T>(
            initialState !== undefined ? initialState : (stateStore.getState(key) as T)
        );

        React.useEffect(() => {
            if (!stateStore.hasState(key)) {
                stateStore.setState(key, initialState);
            }
        }, [key, initialState]);

        React.useEffect(() => {
            const handleStateChange = (value: T) => {
                setState(value);
            };

           const unsubscribeFunc = stateStore.subscribe(key, handleStateChange)

           return unsubscribeFunc;
        }, [key]);

        function setter(valueOrFunc: T | ((prev: T) => T)): void {
            if (valueOrFunc instanceof Function){
                stateStore.setState(key, valueOrFunc(state));
                return;
            }
            stateStore.setState(key, valueOrFunc);
        }

        return [state, setter];
}

export function useStoreValue<T>(stateStore: StateStore, key: string, initialState?: T): T {
    const [state] = useStoreState(stateStore, key, initialState);
    return state;
}

export function useSetStoreValue<T>(stateStore: StateStore, key: string): (value: T | ((prev: T) => T)) => void {
    const [,setter] = useStoreState(stateStore, key);
    return setter;
}