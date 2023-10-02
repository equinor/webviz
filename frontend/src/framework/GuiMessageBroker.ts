import React from "react";

import { Point } from "@lib/utils/geometry";

export enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
}

export enum GuiState {
    DrawerContent = "drawerContent",
    SettingsPanelWidthInPercent = "settingsPanelWidthInPercent",
    LoadingEnsembleSet = "loadingEnsembleSet",
    ActiveModuleInstanceId = "activeModuleInstanceId",
}

export enum GuiEvent {
    ModuleHeaderPointerDown = "moduleHeaderPointerDown",
    NewModulePointerDown = "newModulePointerDown",
    RemoveModuleInstanceRequest = "removeModuleInstanceRequest",
}

export type GuiEventPayloads = {
    [GuiEvent.ModuleHeaderPointerDown]: {
        moduleInstanceId: string;
        elementPosition: Point;
        pointerPosition: Point;
    };
    [GuiEvent.NewModulePointerDown]: {
        moduleName: string;
        elementPosition: Point;
        pointerPosition: Point;
    };
    [GuiEvent.RemoveModuleInstanceRequest]: {
        moduleInstanceId: string;
    };
};

type GuiStateTypes = {
    [GuiState.DrawerContent]: DrawerContent;
    [GuiState.SettingsPanelWidthInPercent]: number;
    [GuiState.LoadingEnsembleSet]: boolean;
    [GuiState.ActiveModuleInstanceId]: string;
};

const defaultStates: Map<GuiState, any> = new Map();
defaultStates.set(GuiState.DrawerContent, DrawerContent.ModuleSettings);
defaultStates.set(GuiState.SettingsPanelWidthInPercent, 30);
defaultStates.set(GuiState.LoadingEnsembleSet, false);
defaultStates.set(GuiState.ActiveModuleInstanceId, "");

const persistentStates: GuiState[] = [GuiState.SettingsPanelWidthInPercent];

export class GuiMessageBroker {
    private _eventListeners: Map<GuiEvent, Set<(event: any) => void>>;
    private _stateSubscribers: Map<GuiState, Set<(state: any) => void>>;
    private _storedValues: Map<GuiState, any>;

    constructor() {
        this._eventListeners = new Map();
        this._stateSubscribers = new Map();
        this._storedValues = defaultStates;

        this.loadPersistentStates();
    }

    private loadPersistentStates() {
        persistentStates.forEach((state) => {
            const value = localStorage.getItem(state);
            if (value) {
                this._storedValues.set(state, JSON.parse(value));
            }
        });
    }

    private maybeSavePersistentState(state: GuiState) {
        if (persistentStates.includes(state)) {
            // For now, persistent states are only stored in localStorage
            // However, in the future, we may want to store at least some of them in a database on the server
            localStorage.setItem(state, JSON.stringify(this._storedValues.get(state)));
        }
    }

    addEventListener<K extends GuiEvent>(event: K, listener: (event: GuiEventPayloads[K]) => void) {
        const eventListeners = this._eventListeners.get(event) || new Set();
        eventListeners.add(listener);
        this._eventListeners.set(event, eventListeners);
    }

    removeEventListener<K extends GuiEvent>(event: K, listener: (event: GuiEventPayloads[K]) => void) {
        const eventListeners = this._eventListeners.get(event);
        if (eventListeners) {
            eventListeners.delete(listener);
        }
    }

    dispatchEvent<K extends GuiEvent>(event: K, details: GuiEventPayloads[K]) {
        console.debug("dispatching event", event, details);
        const eventListeners = this._eventListeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((listener) => listener({ ...details }));
        }
    }

    addStateSubscriber<K extends GuiState>(state: K, subscriber: (state: GuiStateTypes[K]) => void): () => void {
        const stateSubscribers = this._stateSubscribers.get(state) || new Set();
        stateSubscribers.add(subscriber);

        this._stateSubscribers.set(state, stateSubscribers);

        if (this._storedValues.has(state)) {
            subscriber(this._storedValues.get(state));
        }

        return () => {
            stateSubscribers.delete(subscriber);
        };
    }

    setState<K extends GuiState>(state: K, value: GuiStateTypes[K]) {
        this._storedValues.set(state, value);
        this.maybeSavePersistentState(state);

        const stateSubscribers = this._stateSubscribers.get(state);
        if (stateSubscribers) {
            stateSubscribers.forEach((subscriber) => subscriber(value));
        }
    }

    getState<K extends GuiState>(state: K): GuiStateTypes[K] {
        return this._storedValues.get(state);
    }
}

export function useGuiState<T extends GuiState>(
    guiMessageBroker: GuiMessageBroker,
    key: T
): [GuiStateTypes[T], (value: GuiStateTypes[T] | ((prev: GuiStateTypes[T]) => GuiStateTypes[T])) => void] {
    const [state, setState] = React.useState<GuiStateTypes[T]>(guiMessageBroker.getState(key));

    React.useEffect(() => {
        const handleStateChange = (value: GuiStateTypes[T]) => {
            setState(value);
        };

        const unsubscribeFunc = guiMessageBroker.addStateSubscriber(key, handleStateChange);
        return unsubscribeFunc;
    }, [key, guiMessageBroker]);

    function setter(valueOrFunc: GuiStateTypes[T] | ((prev: GuiStateTypes[T]) => GuiStateTypes[T])): void {
        if (valueOrFunc instanceof Function) {
            guiMessageBroker.setState(key, valueOrFunc(state));
            return;
        }
        guiMessageBroker.setState(key, valueOrFunc);
    }

    return [state, setter];
}

export function useGuiValue<T extends GuiState>(guiMessageBroker: GuiMessageBroker, key: T): GuiStateTypes[T] {
    const [state] = useGuiState(guiMessageBroker, key);
    return state;
}

export function useSetGuiValue<T extends GuiState>(
    guiMessageBroker: GuiMessageBroker,
    key: T
): (value: GuiStateTypes[T] | ((prev: GuiStateTypes[T]) => GuiStateTypes[T])) => void {
    const [, setter] = useGuiState(guiMessageBroker, key);
    return setter;
}
