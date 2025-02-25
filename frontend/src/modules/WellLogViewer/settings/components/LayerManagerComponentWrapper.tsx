import React from "react";

import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { WellPicksLayer } from "@modules/WellLogViewer/LayerFramework/layers/WellPicksLayer/WellPicksLayer";
import { LayersActionGroup } from "@modules/_shared/LayerFramework/LayersActions";
import { GroupDelegate, GroupDelegateTopic } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import { LayerManager, LayerManagerTopic } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManager";
import { LayerManagerComponent } from "@modules/_shared/LayerFramework/framework/LayerManager/LayerManagerComponent";
import { useQueryClient } from "@tanstack/react-query";

import { useAtom } from "jotai";

import { layerManagerAtom } from "../atoms/baseAtoms";
import { serializedManagerStateAtom } from "../atoms/persistedAtoms";

enum LayerActionIdents {
    TRACK = "track",
    SETTINGS = "settings",
    PLOT = "plot",
    WELL_PICKS = "well_picks",
}

const LAYER_ACTIONS: LayersActionGroup[] = [
    {
        label: "Log viewer",
        children: [
            {
                label: "Track",
                identifier: LayerActionIdents.TRACK,
            },
            {
                label: "Viewer Settings",
                identifier: LayerActionIdents.SETTINGS,
            },
            {
                label: "Well picks",
                identifier: LayerActionIdents.WELL_PICKS,
            },
        ],
    },
];

function usePersistedLayerManager(
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): LayerManager | null {
    const queryClient = useQueryClient();

    const hasAppliedPersistedState = React.useRef<boolean>(false);
    const [layerManager, setLayerManager] = useAtom(layerManagerAtom);
    const [serializedManagerState, setSerializedManagerState] = useAtom(serializedManagerStateAtom);

    // const applyPersistedManagerState = React.useCallback(function applyPersistedManagerState(layerManager) {}, [
    //     serializedManagerState,
    // ]);

    const persistManagerState = React.useCallback(
        function persistManagerState() {
            if (!layerManager) return;

            setSerializedManagerState(layerManager.serializeState());
        },
        [layerManager, setSerializedManagerState]
    );

    React.useEffect(
        function initalizeLayerManagerEffect() {
            const newLayerManager = new LayerManager(workbenchSession, workbenchSettings, queryClient);
            setLayerManager(newLayerManager);
            hasAppliedPersistedState.current = false;

            return () => newLayerManager.beforeDestroy();
        },
        [queryClient, setLayerManager, workbenchSession, workbenchSettings]
    );

    // applyPersistedManagerState(layerManager);
    React.useEffect(
        function applyManagerState() {
            if (!layerManager || !serializedManagerState) return;
            if (hasAppliedPersistedState.current) return;

            layerManager.deserializeState(serializedManagerState);

            hasAppliedPersistedState.current = true;
        },
        [serializedManagerState, layerManager]
    );

    React.useEffect(
        function setupManagerListenersEffect() {
            if (!layerManager) return;
            //
            persistManagerState();

            const unsubscribeDataRev = layerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.LAYER_DATA_REVISION)(persistManagerState);

            const unsubscribeExpands = layerManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistManagerState);

            return function onUnmountEffect() {
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [layerManager, persistManagerState]
    );

    return layerManager;

    // const applyPersistedManagerState = React.useCallback(function applyPersistedManagerState(layerManager: LayerManager) {
    //     const serializedState = window.localStorage.getItem(`${props.moduleInstanceId}-settings`);
    //     if (!serializedState) return;

    //     const parsedState = JSON.parse(serializedState);
    //     if (parsedState.fieldIdentifier) {
    //         layerManager.setFieldIdentifier(parsedState.fieldIdentifier);
    //     }
    //     if (parsedState.preferredViewLayout) {
    //         layerManager.setPreferredViewLayout(parsedState.preferredViewLayout);
    //     }
    // }, [])

    // React.useEffect(() => applyPersistedState(layerManager),
    //     [layerManager, applyPersistedState]
    // );
}

export type LayerManagerComponentWrapperProps = {
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function LayerManagerComponentWrapper(props: LayerManagerComponentWrapperProps): React.ReactNode {
    const layerManager = usePersistedLayerManager(props.workbenchSession, props.workbenchSettings);

    const layerActionCallback = React.useCallback(
        function layerActionCallback(identifier: string, groupDelegate: GroupDelegate) {
            switch (identifier) {
                case LayerActionIdents.WELL_PICKS:
                    return groupDelegate.appendChild(new WellPicksLayer(layerManager!));
            }
        },
        [layerManager]
    );

    if (!layerManager) return <div />;

    return (
        <>
            <LayerManagerComponent
                layerManager={layerManager}
                additionalHeaderComponents={<></>}
                layerActions={LAYER_ACTIONS}
                onLayerAction={layerActionCallback}
            />
        </>
    );
}
