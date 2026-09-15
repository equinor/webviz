import React from "react";

import type { QueryClient } from "@tanstack/query-core";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { GroupDelegateTopic } from "../delegates/GroupDelegate";
import { DataProviderManager, DataProviderManagerTopic } from "../framework/DataProviderManager/DataProviderManager";

export type UsePersistedDataProviderManagerOptions = {
    /** Callback to set the DataProviderManager instance - must be reference-stable */
    setDataProviderManager: (manager: DataProviderManager) => void;
    /** Callback to set the serialized state - must be reference-stable */
    setSerializedState: (state: string) => void;
    serializedState: string | null;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    queryClient: QueryClient;
};

export function usePersistedDataProviderManager(options: UsePersistedDataProviderManagerOptions): void {
    const {
        setDataProviderManager,
        serializedState,
        setSerializedState,
        workbenchSession,
        workbenchSettings,
        queryClient,
    } = options;

    // Ref to track last persisted serialized state - to avoid redundant applications of same state to manager
    const currentSerializedStateRef = React.useRef(serializedState);
    const setSerializedStateRef = React.useRef(setSerializedState);
    currentSerializedStateRef.current = serializedState;
    setSerializedStateRef.current = setSerializedState; // updated every render, no effect needed

    const dataProviderManagerRef = React.useRef<DataProviderManager | null>(null);
    const dataProviderSerializedStateRef = React.useRef<string | null>(null);

    /**
     * Persist DataProviderManager state to external storage.
     */
    const persistDataProviderManagerState = React.useCallback(function persistDataProviderManagerState() {
        const manager = dataProviderManagerRef.current;
        if (!manager) {
            return;
        }

        const serializedState = JSON.stringify(manager.serializeState());
        dataProviderSerializedStateRef.current = serializedState;
        setSerializedStateRef.current(serializedState);
    }, []);

    /**
     * Setup DataProviderManager on mount, and clean up on unmount.
     * Dependencies: workbenchSession, workbenchSettings, queryClient
     * - setDataProviderManager is excluded as it's a stable atom setter
     * - When workbenchSession/workbenchSettings change, we get a new atom store, so this recreates the manager
     * - queryClient should never change in practice
     */
    React.useEffect(
        function setupDataProviderManagerEffect() {
            const manager = new DataProviderManager(workbenchSession, workbenchSettings, queryClient);
            dataProviderManagerRef.current = manager;
            setDataProviderManager(manager);

            // Reset ref tracking last persisted state
            dataProviderSerializedStateRef.current = null;

            // If there is an existing state, make sure we apply it when we create a new manager
            // ! Currently, *all* dependencies are technically static, so this arguably not relevant
            // ! as we, effectively, will always run this effect, followed by persistedDataChangeEffect below
            if (currentSerializedStateRef.current) {
                dataProviderManagerRef.current.deserializeState(JSON.parse(currentSerializedStateRef.current));
            }

            // Subscribe to DataProviderManager state changes to persist state.
            const unsubscribeDataRev = manager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION)(persistDataProviderManagerState);
            const unsubscribeExpands = manager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistDataProviderManagerState);

            return function cleanup() {
                unsubscribeDataRev();
                unsubscribeExpands();
                manager.beforeDestroy();
            };
        },
        [persistDataProviderManagerState, queryClient, setDataProviderManager, workbenchSession, workbenchSettings],
    );

    /**
     * Apply persisted serialized state to DataProviderManager.
     * This should only apply the state once per manager, when the serialized state changes.
     * ! Effects run in order! Ensure this effect always runs after the effect that initializes the manager!
     */
    React.useEffect(
        function persistedDataChangeEffect() {
            if (!dataProviderManagerRef.current || !serializedState) {
                return;
            }

            if (serializedState === dataProviderSerializedStateRef.current) {
                return;
            }

            dataProviderManagerRef.current.deserializeState(JSON.parse(serializedState));
        },
        [serializedState],
    );
}
