import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { GroupDelegateTopic } from "@modules/_shared/LayerFramework/delegates/GroupDelegate";
import { useQueryClient } from "@tanstack/react-query";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { layerManagerAtom, preferredViewLayoutAtom, userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { LayerManagerComponentWrapper } from "./components/layerManagerComponentWrapper";

import {
    DataLayerManager,
    LayerManagerTopic,
} from "../../_shared/LayerFramework/framework/DataLayerManager/DataLayerManager";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();

    const [layerManager, setLayerManager] = useAtom(layerManagerAtom);

    const fieldIdentifier = useAtomValue(selectedFieldIdentifierAtom);
    const setFieldIdentifier = useSetAtom(userSelectedFieldIdentifierAtom);
    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const persistState = React.useCallback(
        function persistLayerManagerState() {
            if (!layerManager) {
                return;
            }

            const serializedState = {
                layerManager: layerManager.serializeState(),
                fieldIdentifier,
                preferredViewLayout,
            };
            window.localStorage.setItem(
                `${props.settingsContext.getInstanceIdString()}-settings`,
                JSON.stringify(serializedState),
            );
        },
        [layerManager, fieldIdentifier, preferredViewLayout, props.settingsContext],
    );

    const applyPersistedState = React.useCallback(
        function applyPersistedState(layerManager: DataLayerManager) {
            const serializedState = window.localStorage.getItem(
                `${props.settingsContext.getInstanceIdString()}-settings`,
            );
            if (!serializedState) {
                return;
            }

            const parsedState = JSON.parse(serializedState);
            if (parsedState.fieldIdentifier) {
                setFieldIdentifier(parsedState.fieldIdentifier);
            }
            if (parsedState.preferredViewLayout) {
                setPreferredViewLayout(parsedState.preferredViewLayout);
            }

            if (parsedState.layerManager) {
                if (!layerManager) {
                    return;
                }
                layerManager.deserializeState(parsedState.layerManager);
            }
        },
        [setFieldIdentifier, setPreferredViewLayout, props.settingsContext],
    );

    React.useEffect(
        function onMountEffect() {
            const newLayerManager = new DataLayerManager(props.workbenchSession, props.workbenchSettings, queryClient);
            setLayerManager(newLayerManager);

            applyPersistedState(newLayerManager);

            return function onUnmountEffect() {
                newLayerManager.beforeDestroy();
            };
        },
        [setLayerManager, props.workbenchSession, props.workbenchSettings, queryClient, applyPersistedState],
    );

    React.useEffect(
        function onLayerManagerChangeEffect() {
            if (!layerManager) {
                return;
            }

            persistState();

            const unsubscribeDataRev = layerManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(LayerManagerTopic.LAYER_DATA_REVISION)(persistState);

            const unsubscribeExpands = layerManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistState);

            return function onUnmountEffect() {
                layerManager.beforeDestroy();
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [layerManager, props.workbenchSession, props.workbenchSettings, persistState],
    );

    React.useEffect(
        function onFieldIdentifierChangedEffect() {
            if (!layerManager) {
                return;
            }
            layerManager.updateGlobalSetting("fieldId", fieldIdentifier);
        },
        [fieldIdentifier, layerManager],
    );

    function handleFieldChange(fieldId: string | null) {
        setFieldIdentifier(fieldId);
        if (!layerManager) {
            return;
        }
        layerManager.updateGlobalSetting("fieldId", fieldId);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <CollapsibleGroup title="Field" expanded>
                <FieldDropdown ensembleSet={ensembleSet} onChange={handleFieldChange} value={fieldIdentifier} />
            </CollapsibleGroup>
            {layerManager && (
                <LayerManagerComponentWrapper
                    layerManager={layerManager}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            )}
        </div>
    );
}
