import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";


import {
    DataProviderManager,
    DataProviderManagerTopic,
} from "../../_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";

import { dataProviderManagerAtom, preferredViewLayoutAtom, userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";


export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);

    const fieldIdentifier = useAtomValue(selectedFieldIdentifierAtom);
    const setFieldIdentifier = useSetAtom(userSelectedFieldIdentifierAtom);
    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const persistState = React.useCallback(
        function persistLayerManagerState() {
            if (!dataProviderManager) {
                return;
            }

            const serializedState = {
                layerManager: dataProviderManager.serializeState(),
                fieldIdentifier,
                preferredViewLayout,
            };
            window.localStorage.setItem(
                `${props.settingsContext.getInstanceIdString()}-settings`,
                JSON.stringify(serializedState),
            );
        },
        [dataProviderManager, fieldIdentifier, preferredViewLayout, props.settingsContext],
    );

    const applyPersistedState = React.useCallback(
        function applyPersistedState(layerManager: DataProviderManager) {
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
                dataProviderManager.beforeDestroy();
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
            dataProviderManager.updateGlobalSetting("fieldId", fieldIdentifier);
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
                <FieldDropdown ensembleSet={ensembleSet} onChange={handleFieldChange} value={fieldIdentifier} />
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
