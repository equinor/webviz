import React from "react";

import { Point } from "./utils/geometry";

type ActionMap<M extends { [key: string]: boolean | undefined }> = {
    [key in keyof M]: M[key] extends undefined ? { type: key } : { type: key; payload: M[key] };
};

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

export enum GuiActions {
    OPEN_MODULES_DRAWER = "OPEN_MODULES_DRAWER",
    OPEN_SYNC_SETTINGS_DRAWER = "OPEN_SYNC_SETTINGS_DRAWER",
    CLOSE_DRAWER = "CLOSE_DRAWER",
}

type Payload = {
    [GuiActions.OPEN_MODULES_DRAWER]: undefined;
    [GuiActions.OPEN_SYNC_SETTINGS_DRAWER]: undefined;
    [GuiActions.CLOSE_DRAWER]: undefined;
};

export type Actions = ActionMap<Payload>[keyof ActionMap<Payload>];

const initialState: GuiStateType = {
    draggedNewModule: null,
    openedDrawer: null,
};

export const GuiStateReducer = (
    state: GuiStateType,
    action: ActionMap<Payload>[keyof ActionMap<Payload>]
): GuiStateType => {
    switch (action.type) {
        case GuiActions.OPEN_MODULES_DRAWER:
            return {
                ...state,
                openedDrawer: Drawer.ADD_MODULE,
            };
        case GuiActions.OPEN_SYNC_SETTINGS_DRAWER:
            return {
                ...state,
                openedDrawer: Drawer.SYNC_SETTINGS,
            };
        case GuiActions.CLOSE_DRAWER:
            return {
                ...state,
                openedDrawer: null,
            };
        default:
            return state;
    }
};

type GuiStateContextType = {
    state: GuiStateType;
    dispatch: React.Dispatch<ActionMap<Payload>[keyof ActionMap<Payload>]>;
};

export const GuiStateContext = React.createContext<GuiStateContextType | null>(null);

type GuiStateProviderProps = {
    children: React.ReactNode;
};

class GuiState {
    private _state: GuiStateType;
    private _subscribers: Set<{
        selector: <TSelected>(state: GuiStateType) => TSelected;
        callback: <TSelected>(value: TSelected) => void;
    }>;

    constructor(initialState: GuiStateType) {
        this._state = initialState;
        this._subscribers = new Set();
    }

    subscribe(
        selector: <TSelected>(state: GuiStateType) => TSelected,
        callback: <TSelected>(value: TSelected) => void
    ): () => void {
        const subscriber = { selector, callback };
        this._subscribers.add(subscriber);

        return () => {
            this._subscribers.delete(subscriber);
        };
    }

    setState(newState: GuiStateType): void {
        for (const subscriber of this._subscribers) {
            if (subscriber.selector(newState) !== subscriber.selector(this._state)) {
                subscriber.callback(subscriber.selector(newState));
            }
        }

        this._state = newState;
    }

    getState(): GuiStateType {
        return this._state;
    }
}

const guiState = new GuiState(initialState);

export const GuiStateProvider: React.FC<GuiStateProviderProps> = ({ children }) => {
    const [state, dispatch] = React.useReducer(GuiStateReducer, guiState);

    return <GuiStateContext.Provider value={{ state, dispatch }}>{children}</GuiStateContext.Provider>;
};

export const useGuiSelector = <TSelected,>(selector: <TSelected>(state: GuiStateType) => TSelected): TSelected => {
    const [stateSelection, setStateSelection] = React.useState<TSelected>(selector(guiState.getState()));

    React.useEffect(() => {
        function handleStateChange<T extends TSelected>(state: T): void {
            setStateSelection(state);
        }
        const unsubscribeFunc = guiState.subscribe(selector, handleStateChange);

        return unsubscribeFunc;
    }, [selector]);

    return stateSelection;
};

export const useGuiDispatch = (action: ActionMap<Payload>[keyof ActionMap<Payload>]): void => {
    const guiContext = useGuiState();
    return guiContext.dispatch(action);
};

export const useGuiState = (): GuiStateContextType =>
    React.useContext<GuiStateContextType>(GuiStateContext as React.Context<GuiStateContextType>);
