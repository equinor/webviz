import React from "react";

import { v4 } from "uuid";

export class StateStore {
    private _state: { [key: string]: any };
    private uuid: string;

    constructor() {
        this._state = {};
        this.uuid = v4();
    }

    private getCustomEventName(name: string): string {
        return `${this.uuid}-${name as string}`;
    }

    private hasState(key: string): boolean {
        return key in this._state;
    }

    public getState(key: string): unknown {
        return this._state[key];
    }

    public setState(key: string, value: unknown) {
        this._state[key] = value;
        dispatchEvent(
            new CustomEvent(this.getCustomEventName(key), { detail: value })
        );
    }

    public useState(): <T>(
        key: string,
        initialState?: T
    ) => [T, (value: T) => void] {
        const stateStore = this;
        return <T,>(key: string, initialState?: T) => {
            const [state, setState] = React.useState<T>(
                initialState !== undefined
                    ? initialState
                    : (stateStore.getState(key) as T)
            );

            React.useEffect(() => {
                if (!stateStore.hasState(key)) {
                    stateStore.setState(key, initialState);
                }
            }, [key, initialState]);

            React.useEffect(() => {
                const handleStateChange = () => {
                    setState(stateStore.getState(key) as T);
                };

                window.addEventListener(
                    stateStore.getCustomEventName(key),
                    handleStateChange
                );

                return () => {
                    removeEventListener(
                        stateStore.getCustomEventName(key),
                        handleStateChange
                    );
                };
            }, [key]);

            return [state, stateStore.setState.bind(stateStore, key)];
        };
    }

    public useStateValue(): <T>(key: string, initialState?: T) => T {
        const stateStore = this;
        return <T,>(key: string, initialState?: T) => {
            const [state, setState] = React.useState<T>(
                initialState !== undefined
                    ? initialState
                    : (stateStore.getState(key) as T)
            );

            React.useEffect(() => {
                if (!stateStore.hasState(key)) {
                    stateStore.setState(key, initialState);
                }
            }, [key, initialState]);

            React.useEffect(() => {
                const handleStateChange = () => {
                    setState(this.getState(key) as T);
                };

                window.addEventListener(
                    this.getCustomEventName(key),
                    handleStateChange
                );

                return () => {
                    removeEventListener(
                        this.getCustomEventName(key),
                        handleStateChange
                    );
                };
            }, [state]);

            return state;
        };
    }

    public setStateValue<T>(key: string) {
        return (newValue: T) => this.setState(key, newValue);
    }
}
