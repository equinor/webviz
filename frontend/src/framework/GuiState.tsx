import React from "react";

import { cloneDeep } from "lodash";

import { Point } from "./utils/geometry";

type PayloadAction<P = void, T extends string = string, M = never, E = never> = {
    payload: P;
    type: T;
} & ([M] extends [never]
    ? object
    : {
          meta: M;
      }) &
    ([E] extends [never]
        ? object
        : {
              error: E;
          });

type Subscriber<G, T> = {
    selector: (state: G) => T;
    callback: (value: T) => void;
};

class GuiState<G, R extends Record<string, ((state: G) => void) | ((state: G, action: PayloadAction<any>) => void)>> {
    private _state: G;
    private _subscribers: Set<Subscriber<G, any>>;
    private _reducers: R;
    private _actions: {
        [key in keyof R]: (
            payload?: Parameters<R[key]>[1] extends PayloadAction<any>
                ? Pick<Parameters<R[key]>[1], "payload">
                : undefined
        ) => PayloadAction<typeof payload extends undefined ? undefined : typeof payload>;
    };

    constructor(initialState: G, reducers: R) {
        this._state = initialState;
        this._subscribers = new Set();
        this._reducers = reducers;

        this._actions = Object.fromEntries(
            Object.entries(reducers).map(([key, reducer]) => {
                return [
                    key,
                    (payload?: Parameters<typeof reducer>[1]): PayloadAction<typeof payload> => ({
                        payload,
                        type: key,
                    }),
                ];
            })
        ) as any;
    }

    private subscribe<T>(selector: (state: G) => T, callback: (value: T) => void): () => void {
        const subscriber = { selector, callback };
        this._subscribers.add(subscriber);

        return () => {
            this._subscribers.delete(subscriber);
        };
    }

    private runReducer(reducerName: string, action: PayloadAction<any>): void {
        const oldState = cloneDeep(this._state);
        const reducer = this._reducers[reducerName as keyof typeof this._reducers];
        reducer(this._state, action);
        for (const subscriber of this._subscribers) {
            if (subscriber.selector(this._state) !== subscriber.selector(oldState)) {
                subscriber.callback(subscriber.selector(this._state));
            }
        }
    }

    useSelector<TSelected>(selector: (state: G) => TSelected): TSelected {
        const [stateSelection, setStateSelection] = React.useState<ReturnType<typeof selector>>(selector(this._state));

        React.useEffect(() => {
            function handleStateChange(value: TSelected): void {
                setStateSelection(value);
            }
            const unsubscribeFunc = this.subscribe(selector, handleStateChange);

            return unsubscribeFunc;
        }, []);

        return stateSelection;
    }

    useDispatch(): <
        A extends {
            [key in keyof R]: (
                payload?: Parameters<R[key]>[1] extends PayloadAction<any>
                    ? Pick<Parameters<R[key]>[1], "payload">
                    : undefined
            ) => PayloadAction<typeof payload extends undefined ? undefined : typeof payload>;
        }
    >(
        result: ReturnType<A[keyof A]>
    ) => void {
        return (result: ReturnType<(typeof this._actions)[keyof typeof this._actions]>): void => {
            this.runReducer(result.type, result);
        };
    }

    getActions(): {
        [key in keyof R]: (
            payload?: Parameters<R[key]>[1] extends PayloadAction<any>
                ? Pick<Parameters<R[key]>[1], "payload">
                : undefined
        ) => PayloadAction<typeof payload extends undefined ? undefined : typeof payload>;
    } {
        return this._actions;
    }
}

export enum Drawer {
    ADD_MODULE = "ADD_MODULE",
    SYNC_SETTINGS = "SYNC_SETTINGS",
}

type GuiStateType = {
    draggedNewModule: {
        name: string;
        origin: Point;
    } | null;
    openedDrawer: Drawer | null;
};

const reducers = {
    openModulesDrawer: (state: GuiStateType): void => {
        state.openedDrawer = Drawer.ADD_MODULE;
    },
    openSyncSettingsDrawer: (state: GuiStateType): void => {
        state.openedDrawer = Drawer.SYNC_SETTINGS;
    },
    closeDrawer: (state: GuiStateType): void => {
        state.openedDrawer = null;
    },
    startDraggingNewModule: (state: GuiStateType, action: PayloadAction<{ name: string; origin: Point }>): void => {
        state.draggedNewModule = action.payload;
    },
};

const initialState: GuiStateType = {
    draggedNewModule: null,
    openedDrawer: null,
};

const guiState = new GuiState<GuiStateType, typeof reducers>(initialState, reducers);

export const useGuiSelector = guiState.useSelector.bind(guiState);
export const useGuiDispatch = guiState.useDispatch.bind(guiState);

export const { openModulesDrawer, closeDrawer, openSyncSettingsDrawer, startDraggingNewModule } = guiState.getActions();
