import React from "react";

import { isDevMode } from "@lib/utils/devMode";
import type { Size2D } from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";

import type { UnsavedChangesAction } from "./types/unsavedChangesAction";

export enum LeftDrawerContent {
    ModuleSettings = "ModuleSettings",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
}

export enum RightDrawerContent {
    RealizationFilterSettings = "RealizationFilterSettings",
    ModuleInstanceLog = "ModuleInstanceLog",
}

export enum GuiState {
    LeftDrawerContent = "leftDrawerContent",
    RightDrawerContent = "rightDrawerContent",
    LeftSettingsPanelWidthInPercent = "leftSettingsPanelWidthInPercent",
    ActiveModuleInstanceId = "activeModuleInstanceId",
    DataChannelConnectionLayerVisible = "dataChannelConnectionLayerVisible",
    DevToolsVisible = "devToolsVisible",
    EditDataChannelConnections = "editDataChannelConnections",
    RightSettingsPanelWidthInPercent = "rightSettingsPanelWidthInPercent",
    AppInitialized = "appInitialized",
    NumberOfUnsavedRealizationFilters = "numberOfUnsavedRealizationFilters",
}

export enum GuiEvent {
    ModuleHeaderPointerDown = "moduleHeaderPointerDown",
    NewModulePointerDown = "newModulePointerDown",
    RemoveModuleInstanceRequest = "removeModuleInstanceRequest",
    EditDataChannelConnectionsForModuleInstanceRequest = "editDataChannelConnectionsForModuleInstanceRequest",
    ShowDataChannelConnectionsRequest = "showDataChannelConnectionsRequest",
    HideDataChannelConnectionsRequest = "hideDataChannelConnectionsRequest",
    HighlightDataChannelConnectionRequest = "highlightDataChannelConnectionRequest",
    UnhighlightDataChannelConnectionRequest = "unhighlightDataChannelConnectionRequest",
    DataChannelPointerUp = "dataChannelPointerUp",
    DataChannelOriginPointerDown = "dataChannelOriginPointerDown",
    DataChannelConnectionsChange = "dataChannelConnectionsChange",
    DataChannelNodeHover = "dataChannelNodeHover",
    DataChannelNodeUnhover = "dataChannelNodeUnhover",
    UnsavedRealizationFilterSettingsAction = "unsavedRealizationFilterSettingsAction",
}

export type GuiEventPayloads = {
    [GuiEvent.ModuleHeaderPointerDown]: {
        moduleInstanceId: string;
        elementPosition: Vec2;
        elementSize: Size2D;
        pointerPosition: Vec2;
    };
    [GuiEvent.NewModulePointerDown]: {
        moduleName: string;
        elementPosition: Vec2;
        elementSize: Size2D;
        pointerPosition: Vec2;
    };
    [GuiEvent.RemoveModuleInstanceRequest]: {
        moduleInstanceId: string;
    };
    [GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest]: {
        moduleInstanceId: string;
    };
    [GuiEvent.HighlightDataChannelConnectionRequest]: {
        moduleInstanceId: string;
        receiverIdString: string;
    };
    [GuiEvent.DataChannelOriginPointerDown]: {
        moduleInstanceId: string;
        originElement: HTMLElement;
    };
    [GuiEvent.DataChannelNodeHover]: {
        connectionAllowed: boolean;
    };
    [GuiEvent.UnsavedRealizationFilterSettingsAction]: {
        action: UnsavedChangesAction;
    };
};

type GuiStateValueTypes = {
    [GuiState.LeftDrawerContent]: LeftDrawerContent;
    [GuiState.RightDrawerContent]: RightDrawerContent;
    [GuiState.LeftSettingsPanelWidthInPercent]: number;
    [GuiState.ActiveModuleInstanceId]: string;
    [GuiState.DataChannelConnectionLayerVisible]: boolean;
    [GuiState.DevToolsVisible]: boolean;
    [GuiState.EditDataChannelConnections]: boolean;
    [GuiState.RightSettingsPanelWidthInPercent]: number;
    [GuiState.AppInitialized]: boolean;
    [GuiState.NumberOfUnsavedRealizationFilters]: number;
};

const defaultStates: Map<GuiState, any> = new Map();
defaultStates.set(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
defaultStates.set(GuiState.RightDrawerContent, RightDrawerContent.RealizationFilterSettings);
defaultStates.set(GuiState.LeftSettingsPanelWidthInPercent, 30);
defaultStates.set(GuiState.ActiveModuleInstanceId, "");
defaultStates.set(GuiState.DataChannelConnectionLayerVisible, false);
defaultStates.set(GuiState.DevToolsVisible, isDevMode());
defaultStates.set(GuiState.RightSettingsPanelWidthInPercent, 0);
defaultStates.set(GuiState.AppInitialized, false);
defaultStates.set(GuiState.NumberOfUnsavedRealizationFilters, 0);

const persistentStates: GuiState[] = [
    GuiState.LeftSettingsPanelWidthInPercent,
    GuiState.DevToolsVisible,
    GuiState.RightSettingsPanelWidthInPercent,
    GuiState.RightDrawerContent,
    GuiState.NumberOfUnsavedRealizationFilters,
];

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
                try {
                    this._storedValues.set(state, JSON.parse(value));
                } catch (e) {
                    console.warn(
                        `Failed to parse value for state '${state}': ${value} - removing invalid state from local storage and using default value instead.`
                    );
                    localStorage.removeItem(state);
                }
            }
        });
    }

    private maybeSavePersistentState(state: GuiState) {
        if (persistentStates.includes(state)) {
            // For now, persistent states are only stored in localStorage
            // However, in the future, we may want to store at least some of them in a database on the server
            const stateValue = this._storedValues.get(state);
            if (stateValue === undefined || stateValue === null) {
                return;
            }
            localStorage.setItem(state, JSON.stringify(stateValue));
        }
    }

    subscribeToEvent<T extends Exclude<GuiEvent, keyof GuiEventPayloads>>(event: T, callback: () => void): () => void;
    subscribeToEvent<T extends keyof GuiEventPayloads>(
        event: T,
        callback: (payload: GuiEventPayloads[T]) => void
    ): () => void;
    subscribeToEvent<T extends GuiEvent>(event: T, callback: (payload?: any) => void): () => void {
        const eventListeners = this._eventListeners.get(event) || new Set();
        eventListeners.add(callback);
        this._eventListeners.set(event, eventListeners);

        return () => {
            eventListeners.delete(callback);
        };
    }

    publishEvent<T extends Exclude<GuiEvent, keyof GuiEventPayloads>>(event: T): void;
    publishEvent<T extends keyof GuiEventPayloads>(event: T, payload: GuiEventPayloads[T]): void;
    publishEvent<T extends GuiEvent>(event: T, payload?: any): void {
        const eventListeners = this._eventListeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((callback) => callback({ ...payload }));
        }
    }

    makeStateSubscriberFunction<T extends GuiState>(state: T): (onStoreChangeCallback: () => void) => () => void {
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

    setState<T extends GuiState>(state: T, value: GuiStateValueTypes[T]) {
        this._storedValues.set(state, value);
        this.maybeSavePersistentState(state);

        const stateSubscribers = this._stateSubscribers.get(state);
        if (stateSubscribers) {
            stateSubscribers.forEach((subscriber) => subscriber(value));
        }
    }

    getState<T extends GuiState>(state: T): GuiStateValueTypes[T] {
        return this._storedValues.get(state);
    }

    /*
        It is really important that the snapshot returned by "stateSnapshotGetter"
        returns the same value as long as the state has not been changed.

    */
    makeStateSnapshotGetter<T extends GuiState>(state: T): () => GuiStateValueTypes[T] {
        // Using arrow function in order to keep "this" in context
        const stateSnapshotGetter = (): GuiStateValueTypes[T] => {
            return this._storedValues.get(state);
        };

        return stateSnapshotGetter;
    }
}

export function useGuiState<T extends GuiState>(
    guiMessageBroker: GuiMessageBroker,
    state: T
): [
    GuiStateValueTypes[T],
    (value: GuiStateValueTypes[T] | ((prev: GuiStateValueTypes[T]) => GuiStateValueTypes[T])) => void
] {
    const stateValue = React.useSyncExternalStore<GuiStateValueTypes[T]>(
        guiMessageBroker.makeStateSubscriberFunction(state),
        guiMessageBroker.makeStateSnapshotGetter(state)
    );

    const stateSetter = React.useCallback(
        function stateSetter(
            valueOrFunc: GuiStateValueTypes[T] | ((prev: GuiStateValueTypes[T]) => GuiStateValueTypes[T])
        ): void {
            if (valueOrFunc instanceof Function) {
                const value = guiMessageBroker.getState(state);
                guiMessageBroker.setState(state, valueOrFunc(value));
                return;
            }
            guiMessageBroker.setState(state, valueOrFunc);
        },
        [guiMessageBroker, state]
    );

    return [stateValue, stateSetter];
}

export function useGuiValue<T extends GuiState>(guiMessageBroker: GuiMessageBroker, state: T): GuiStateValueTypes[T] {
    const [stateValue] = useGuiState(guiMessageBroker, state);
    return stateValue;
}
