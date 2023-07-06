import React from "react";

import { cloneDeep } from "lodash";

import { Point } from "./utils/geometry";

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

type PayloadAction<P = void, T extends string = string, M = never, E = never> = {
    payload: P;
    type: T;
} & ([M] extends [never]
    ? Record<string, never>
    : {
          meta: M;
      }) &
    ([E] extends [never]
        ? Record<string, never>
        : {
              error: E;
          });

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

type Reducer = (typeof reducers)[keyof typeof reducers];

class GuiState {
    private _state: GuiStateType;
    private _subscribers: Set<{
        selector: (state: GuiStateType) => unknown;
        callback: (state: GuiStateType) => void;
    }>;

    constructor(initialState: GuiStateType) {
        this._state = initialState;
        this._subscribers = new Set();
    }

    subscribe(selector: (state: GuiStateType) => unknown, callback: (state: GuiStateType) => void): () => void {
        const subscriber = { selector, callback };
        this._subscribers.add(subscriber);

        return () => {
            this._subscribers.delete(subscriber);
        };
    }

    getState(): GuiStateType {
        return this._state;
    }

    modify(reducerName: string, action: PayloadAction<any>): void {
        const oldState = cloneDeep(this._state);
        const reducer = reducers[reducerName as keyof typeof reducers] as Reducer;
        reducer(this._state, action);
        for (const subscriber of this._subscribers) {
            if (subscriber.selector(this._state) !== subscriber.selector(oldState)) {
                subscriber.callback(this._state);
            }
        }
    }
}

const initialState: GuiStateType = {
    draggedNewModule: null,
    openedDrawer: null,
};

const guiState = new GuiState(initialState);

const actions: {
    [key in keyof typeof reducers]: (
        payload?: Parameters<(typeof reducers)[key]>[1] extends PayloadAction<any>
            ? Pick<Parameters<(typeof reducers)[key]>[1], "payload">
            : undefined
    ) => PayloadAction<typeof payload extends undefined ? undefined : typeof payload>;
} = Object.fromEntries(
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

export function useGuiSelector<TSelected>(selector: (state: GuiStateType) => TSelected): TSelected {
    const [stateSelection, setStateSelection] = React.useState<ReturnType<typeof selector>>(
        selector(guiState.getState())
    );

    React.useEffect(() => {
        function handleStateChange(state: GuiStateType): void {
            setStateSelection(selector(state));
        }
        const unsubscribeFunc = guiState.subscribe(selector, handleStateChange);

        return unsubscribeFunc;
    }, []);

    return stateSelection;
}

export function useGuiDispatch(): (result: ReturnType<(typeof actions)[keyof typeof actions]>) => void {
    return (result: ReturnType<(typeof actions)[keyof typeof actions]>): void => {
        guiState.modify(result.type, result);
    };
}

export const { openModulesDrawer, closeDrawer, openSyncSettingsDrawer, startDraggingNewModule } = actions;
