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

    subscribeToEvent<K extends GuiEvent>(event: K, callback: (event: GuiEventPayloads[K]) => void) {
        const eventListeners = this._eventListeners.get(event) || new Set();
        eventListeners.add(callback);
        this._eventListeners.set(event, eventListeners);

        return () => {
            eventListeners.delete(callback);
        };
    }

    publishEvent<K extends GuiEvent>(event: K, details: GuiEventPayloads[K]) {
        const eventListeners = this._eventListeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((callback) => callback({ ...details }));
        }
    }

    makeStateSubscriberFunction<K extends GuiState>(state: K): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const stateSubscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const stateSubscribers = this._stateSubscribers.get(state) || new Set();
            stateSubscribers.add(onStoreChangeCallback);
            this._stateSubscribers.set(state, stateSubscribers);

            return () => {
                stateSubscribers.delete(onStoreChangeCallback);
            };
        };

        return stateSubscriber;
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

    /*
        It is really important that the snapshot returned by "stateSnapshotGetter"
        returns the same value as long as the state has not been changed.

    */
    makeStateSnapshotGetter<K extends GuiState>(state: K): () => GuiStateTypes[K] {
        // Using arrow function in order to keep "this" in context
        const stateSnapshotGetter = (): GuiStateTypes[K] => {
            return this._storedValues.get(state);
        };

        return stateSnapshotGetter;
    }
}

export function useGuiState<T extends GuiState>(
    guiMessageBroker: GuiMessageBroker,
    key: T
): [GuiStateTypes[T], (value: GuiStateTypes[T] | ((prev: GuiStateTypes[T]) => GuiStateTypes[T])) => void] {
    const state = React.useSyncExternalStore<GuiStateTypes[T]>(
        guiMessageBroker.makeStateSubscriberFunction(key),
        guiMessageBroker.makeStateSnapshotGetter(key)
    );

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
