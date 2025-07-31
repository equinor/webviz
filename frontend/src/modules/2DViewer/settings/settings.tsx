import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { PersistableAtomWarningWrapper } from "@modules/_shared/components/PersistableAtomWarningWrapper";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";

import {
    DataProviderManager,
    DataProviderManagerTopic,
} from "../../_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import type { SerializedState } from "../persistedState";

import { dataProviderManagerAtom, dataProviderStateAtom, preferredViewLayoutAtom } from "./atoms/baseAtoms";
import { fieldIdentifierAtom } from "./atoms/derivedAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";

export function Settings(props: ModuleSettingsProps<any, SerializedState>): React.ReactNode {
    const ensembleSet = usePublishSubscribeTopicValue(props.workbenchSession, WorkbenchSessionTopic.EnsembleSet);
    const queryClient = useQueryClient();

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [dataProviderState, setDataProviderState] = useAtom(dataProviderStateAtom);

    const [fieldIdentifier, setFieldIdentifier] = useAtom(fieldIdentifierAtom);
    const [, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const persistState = React.useCallback(
        function persistLayerManagerState() {
            if (!dataProviderManager) {
                return;
            }

            const serializedState = {
                dataProviderManager: dataProviderManager.serializeState(),
            };

            setDataProviderState(JSON.stringify(serializedState));
        },
        [dataProviderManager, setDataProviderState],
    );

    const applyPersistedState = React.useCallback(
        function applyPersistedState(dataProviderManager: DataProviderManager) {
            const serializedState = dataProviderState;

            if (!serializedState) {
                return;
            }

            const parsedState = JSON.parse(serializedState);
            if (parsedState.preferredViewLayout) {
                setPreferredViewLayout(parsedState.preferredViewLayout);
            }

            if (parsedState.dataProviderManager) {
                if (!dataProviderManager) {
                    return;
                }
                dataProviderManager.deserializeState(parsedState.dataProviderManager);
            }
        },
        [setPreferredViewLayout, dataProviderState],
    );

    React.useEffect(
        function onMountEffect() {
            const newLayerManager = new DataProviderManager(
                props.workbenchSession,
                props.workbenchSettings,
                queryClient,
            );
            setDataProviderManager(newLayerManager);

            applyPersistedState(newLayerManager);

            return function onUnmountEffect() {
                newLayerManager.beforeDestroy();
            };
        },
        [setDataProviderManager, props.workbenchSession, props.workbenchSettings, queryClient, applyPersistedState],
    );

    React.useEffect(
        function onLayerManagerChangeEffect() {
            if (!dataProviderManager) {
                return;
            }

            persistState();

            const unsubscribeDataRev = dataProviderManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION)(persistState);

            const unsubscribeExpands = dataProviderManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistState);

            return function onUnmountEffect() {
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [dataProviderManager, props.workbenchSession, props.workbenchSettings, persistState],
    );

    React.useEffect(
        function onFieldIdentifierChangedEffect() {
            if (!dataProviderManager) {
                return;
            }
            dataProviderManager.updateGlobalSetting("fieldId", fieldIdentifier.value);
        },
        [fieldIdentifier, dataProviderManager],
    );

    function handleFieldChange(fieldId: string | null) {
        setFieldIdentifier(fieldId);
        if (!dataProviderManager) {
            return;
        }
        dataProviderManager.updateGlobalSetting("fieldId", fieldId);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <CollapsibleGroup title="Field" expanded>
                <PersistableAtomWarningWrapper atom={fieldIdentifierAtom}>
                    <FieldDropdown
                        ensembleSet={ensembleSet}
                        onChange={handleFieldChange}
                        value={fieldIdentifier.value}
                    />
                </PersistableAtomWarningWrapper>
            </CollapsibleGroup>
            {dataProviderManager && (
                <DataProviderManagerWrapper
                    dataProviderManager={dataProviderManager}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            )}
        </div>
    );
}
