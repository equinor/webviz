import React from "react";

import type { WorkbenchSession } from "@framework/WorkbenchSession";
import type { WorkbenchSettings } from "@framework/WorkbenchSettings";
import type { QueryClient } from "@tanstack/query-core";

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

    const [internalDataProviderManager, setInternalDataProviderManager] = React.useState<DataProviderManager | null>(
        null,
    );

    // Ref to track last persisted serialized state - to avoid redundant applications of same state to manager
    const dataProviderSerializedStateRef = React.useRef<string | null>(null);

    /**
     * Persist DataProviderManager state to external storage.
     */
    const persistDataProviderManagerState = React.useCallback(
        function persistDataProviderManagerState() {
            if (!internalDataProviderManager) {
                return;
            }

            const serializedState = JSON.stringify(internalDataProviderManager.serializeState());
            dataProviderSerializedStateRef.current = serializedState;

            setSerializedState(serializedState);
        },
        [internalDataProviderManager, setSerializedState],
    );

    /**
     * Apply persisted serialized state to DataProviderManager.
     * This should only apply the state once per manager, when the serialized state changes.
     */
    React.useEffect(
        function persistedDataChangeEffect() {
            if (!internalDataProviderManager || !serializedState) {
                return;
            }

            if (serializedState === dataProviderSerializedStateRef.current) {
                return;
            }

            internalDataProviderManager.deserializeState(JSON.parse(serializedState));
        },
        [serializedState, internalDataProviderManager],
    );

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
            setInternalDataProviderManager(manager);
            setDataProviderManager(manager);

            // Reset ref tracking last persisted state
            dataProviderSerializedStateRef.current = null;

            return function cleanup() {
                manager.beforeDestroy();
            };
        },
        [workbenchSession, workbenchSettings, queryClient, setDataProviderManager],
    );

    /**
     * Subscribe to DataProviderManager state changes to persist state.
     * Dependencies: internalDataProviderManager, persistDataProviderManagerState
     * - When the manager changes, we re-subscribe to the new instance
     * - persistDataProviderManagerState includes setSerializedState in its dependencies
     */
    React.useEffect(
        function subscribeToDataProviderManagerStateChangesEffect() {
            if (!internalDataProviderManager) {
                return;
            }

            const unsubscribeDataRev = internalDataProviderManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION)(persistDataProviderManagerState);

            const unsubscribeExpands = internalDataProviderManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistDataProviderManagerState);

            return function onUnmountEffect() {
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [internalDataProviderManager, persistDataProviderManagerState],
    );
}
