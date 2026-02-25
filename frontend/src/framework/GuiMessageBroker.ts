import React from "react";

import { isDevMode } from "@lib/utils/devMode";
import type { Size2D } from "@lib/utils/geometry";
import type { Vec2 } from "@lib/utils/vec2";

import type { EnsembleLoadingErrorInfoMap } from "./internal/EnsembleSetLoader";
import type { SessionPersistenceAction } from "./internal/WorkbenchSession/WorkbenchSessionManager";
import type { UnsavedChangesAction } from "./types/unsavedChangesAction";

export enum LeftDrawerContent {
    ModuleSettings = "ModuleSettings",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
}

export enum RightDrawerContent {
    RealizationFilterSettings = "RealizationFilterSettings",
    ModuleInstanceLog = "ModuleInstanceLog",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
}

export enum GuiState {
    LeftDrawerContent = "leftDrawerContent",
    RightDrawerContent = "rightDrawerContent",
    LeftSettingsPanelWidthInPercent = "leftSettingsPanelWidthInPercent",
    DataChannelConnectionLayerVisible = "dataChannelConnectionLayerVisible",
    DevToolsVisible = "devToolsVisible",
    EditDataChannelConnections = "editDataChannelConnections",
    RightSettingsPanelWidthInPercent = "rightSettingsPanelWidthInPercent",
    AppInitialized = "appInitialized",
    NumberOfUnsavedRealizationFilters = "numberOfUnsavedRealizationFilters",
    NumberOfEffectiveRealizationFilters = "numberOfEffectiveRealizationFilters",
    SaveSessionDialogOpen = "saveSessionDialogOpen",
    IsLoadingEnsembleSet = "isLoadingEnsembleSet",
    IsSavingSession = "isSavingSession",
    IsLoadingSession = "isLoadingSession",
    IsLoadingSnapshot = "isLoadingSnapshot",
    IsMakingSnapshot = "isMakingSnapshot",
    EnsembleDialogOpen = "ensembleDialogOpen",
    MultiSessionsRecoveryDialogOpen = "multiSessionsRecoveryDialogOpen",
    ActiveSessionRecoveryDialogOpen = "activeSessionRecoveryDialogOpen",
    MakeSnapshotDialogOpen = "makeSnapshotDialogOpen",
    TemplatesDialogOpen = "templatesDialogOpen",
    SessionSnapshotOverviewDialogOpen = "sessionSnapshotOverviewDialogOpen",
    SessionSnapshotOverviewDialogMode = "sessionSnapshotOverviewDialogMode",
    EnsemblesLoadingErrorInfoMap = "ensemblesLoadingErrorInfoMap",
    EnsembleLoadingErrorInfoDialogOpen = "ensembleLoadingErrorInfoDialogOpen",
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
    SessionPersistenceError = "sessionPersistenceError",
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
    [GuiEvent.SessionPersistenceError]: {
        /** The persistence lifecycle action that failed (saving, loading) */
        action: SessionPersistenceAction;

        /** The raised error */
        error: Error;

        /** Callback for when user wants to retry the failed action */
        retry: () => void;
    };

};

type GuiStateValueTypes = {
    [GuiState.LeftDrawerContent]: LeftDrawerContent;
    [GuiState.RightDrawerContent]: RightDrawerContent | undefined;
    [GuiState.LeftSettingsPanelWidthInPercent]: number;
    [GuiState.DataChannelConnectionLayerVisible]: boolean;
    [GuiState.DevToolsVisible]: boolean;
    [GuiState.EditDataChannelConnections]: boolean;
    [GuiState.RightSettingsPanelWidthInPercent]: number;
    [GuiState.AppInitialized]: boolean;
    [GuiState.NumberOfUnsavedRealizationFilters]: number;
    [GuiState.NumberOfEffectiveRealizationFilters]: number;
    [GuiState.IsLoadingEnsembleSet]: boolean;
    [GuiState.IsLoadingSession]: boolean;
    [GuiState.IsLoadingSnapshot]: boolean;
    [GuiState.IsSavingSession]: boolean;
    [GuiState.EnsembleDialogOpen]: boolean;
    [GuiState.MultiSessionsRecoveryDialogOpen]: boolean;
    [GuiState.ActiveSessionRecoveryDialogOpen]: boolean;
    [GuiState.MakeSnapshotDialogOpen]: boolean;
    [GuiState.IsMakingSnapshot]: boolean;
    [GuiState.SaveSessionDialogOpen]: boolean;
    [GuiState.TemplatesDialogOpen]: boolean;
    [GuiState.SessionSnapshotOverviewDialogOpen]: boolean;
    [GuiState.SessionSnapshotOverviewDialogMode]: "sessions" | "snapshots";
    [GuiState.EnsemblesLoadingErrorInfoMap]: EnsembleLoadingErrorInfoMap;
    [GuiState.EnsembleLoadingErrorInfoDialogOpen]: boolean;
};

const defaultStates: Map<GuiState, any> = new Map();
defaultStates.set(GuiState.LeftDrawerContent, LeftDrawerContent.ModuleSettings);
defaultStates.set(GuiState.RightDrawerContent, undefined);
defaultStates.set(GuiState.LeftSettingsPanelWidthInPercent, 30);
defaultStates.set(GuiState.DataChannelConnectionLayerVisible, false);
defaultStates.set(GuiState.DevToolsVisible, isDevMode());
defaultStates.set(GuiState.RightSettingsPanelWidthInPercent, 0);
defaultStates.set(GuiState.AppInitialized, false);
defaultStates.set(GuiState.NumberOfUnsavedRealizationFilters, 0);
defaultStates.set(GuiState.NumberOfEffectiveRealizationFilters, 0);
defaultStates.set(GuiState.IsLoadingEnsembleSet, false);
defaultStates.set(GuiState.IsLoadingSession, false);
defaultStates.set(GuiState.IsLoadingSnapshot, false);
defaultStates.set(GuiState.IsSavingSession, false);
defaultStates.set(GuiState.EditDataChannelConnections, false);
defaultStates.set(GuiState.EnsembleDialogOpen, false);
defaultStates.set(GuiState.MultiSessionsRecoveryDialogOpen, false);
defaultStates.set(GuiState.ActiveSessionRecoveryDialogOpen, false);
defaultStates.set(GuiState.MakeSnapshotDialogOpen, false);
defaultStates.set(GuiState.IsMakingSnapshot, false);
defaultStates.set(GuiState.TemplatesDialogOpen, false);
defaultStates.set(GuiState.SessionSnapshotOverviewDialogOpen, false);
defaultStates.set(GuiState.SessionSnapshotOverviewDialogMode, "sessions");
defaultStates.set(GuiState.EnsemblesLoadingErrorInfoMap, {});
defaultStates.set(GuiState.EnsembleLoadingErrorInfoDialogOpen, false);

const persistentStates: GuiState[] = [
    GuiState.LeftSettingsPanelWidthInPercent,
    GuiState.DevToolsVisible,
    GuiState.RightSettingsPanelWidthInPercent,
    GuiState.RightDrawerContent,
    GuiState.NumberOfUnsavedRealizationFilters,
    GuiState.NumberOfEffectiveRealizationFilters,
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
                } catch {
                    console.warn(
                        `Failed to parse value for state '${state}': ${value} - removing invalid state from local storage and using default value instead.`,
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
                localStorage.removeItem(state);
                return;
            }
            localStorage.setItem(state, JSON.stringify(stateValue));
        }
    }

    subscribeToEvent<T extends Exclude<GuiEvent, keyof GuiEventPayloads>>(event: T, callback: () => void): () => void;
    subscribeToEvent<T extends keyof GuiEventPayloads>(
        event: T,
        callback: (payload: GuiEventPayloads[T]) => void,
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

/**
 * Registers a listener attached to a GUI event topic
 * @param guiMessageBroker The GuiMessageBroker instance to register the listener on
 * @param topic The GUI event topic to listen to
 * @param callback The listener event callback
 */
export function useGuiEventListener<T extends Exclude<GuiEvent, keyof GuiEventPayloads>>(
    guiMessageBroker: GuiMessageBroker,
    topic: T,
    callback: () => void,
): void;

export function useGuiEventListener<T extends keyof GuiEventPayloads>(
    guiMessageBroker: GuiMessageBroker,
    topic: T,
    callback: (payload: GuiEventPayloads[T]) => void,
): void;

export function useGuiEventListener<T extends GuiEvent>(
    guiMessageBroker: GuiMessageBroker,
    topic: T,
    callback: (payload?: any) => void,
): void {
    React.useEffect(
        function registerGuiEventListener() {
            // Typescript can't make use of the function override T here, so we need to use any
            const unsubscribe = guiMessageBroker.subscribeToEvent(topic as any, callback);
            return unsubscribe;
        },
        [callback, guiMessageBroker, topic],
    );
}

/**
 * Provides a globally synced React stateful value and setter for a GUI state value.
 * @param guiMessageBroker The GuiMessageBroker instance to use for syncing the state
 * @param state The GUI state value to synchronize to
 * @returns A tuple of the current state value and a setter function to update the state value
 */
export function useGuiState<T extends GuiState>(
    guiMessageBroker: GuiMessageBroker,
    state: T,
): [
    GuiStateValueTypes[T],
    (value: GuiStateValueTypes[T] | ((prev: GuiStateValueTypes[T]) => GuiStateValueTypes[T])) => void,
] {
    const stateValue = React.useSyncExternalStore<GuiStateValueTypes[T]>(
        guiMessageBroker.makeStateSubscriberFunction(state),
        guiMessageBroker.makeStateSnapshotGetter(state),
    );

    const stateSetter = React.useCallback(
        function stateSetter(
            valueOrFunc: GuiStateValueTypes[T] | ((prev: GuiStateValueTypes[T]) => GuiStateValueTypes[T]),
        ): void {
            if (valueOrFunc instanceof Function) {
                const value = guiMessageBroker.getState(state);
                guiMessageBroker.setState(state, valueOrFunc(value));
                return;
            }
            guiMessageBroker.setState(state, valueOrFunc);
        },
        [guiMessageBroker, state],
    );

    return [stateValue, stateSetter];
}

/**
 * Gets a synchronized GUI state value.
 * @param guiMessageBroker The GuiMessageBroker instance to use for syncing the state
 * @param state The GUI state value to synchronize to
 * @returns The current state value
 */
export function useGuiValue<T extends GuiState>(guiMessageBroker: GuiMessageBroker, state: T): GuiStateValueTypes[T] {
    const [stateValue] = useGuiState(guiMessageBroker, state);
    return stateValue;
}
