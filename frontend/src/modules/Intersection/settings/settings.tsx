import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import {
    DataProviderManager,
    DataProviderManagerTopic,
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";

import type { Interfaces } from "../interfaces";

import { dataProviderManagerAtom, dataProviderSerializedStateAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/persistableFixableAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";

export function Settings(props: ModuleSettingsProps<Interfaces>): JSX.Element {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();
    const colorSet = useColorSet(props.workbenchSettings);

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [selectedFieldIdentifier, setSelectedFieldIdentifier] = useAtom(selectedFieldIdentifierAtom);

    const [dataProviderSerializedState, setDataProviderSerializedState] = useAtom(dataProviderSerializedStateAtom);
    const dataProviderSerializedStateRef = React.useRef(dataProviderSerializedState);

    const persistDataProviderManagerState = React.useCallback(
        function persistDataProviderManagerState() {
            if (!dataProviderManager) {
                return;
            }

            const serializedState = {
                dataProviderManager: dataProviderManager.serializeState(),
            };
            setDataProviderSerializedState(JSON.stringify(serializedState));
        },
        [dataProviderManager, setDataProviderSerializedState],
    );

    const applyPersistedState = React.useCallback(
        function applyPersistedState(dataProviderManager: DataProviderManager) {
            const serializedState = dataProviderSerializedStateRef.current;

            if (!serializedState) {
                const groupDelegate = dataProviderManager.getGroupDelegate();

                const doAddDefaultIntersectionView =
                    groupDelegate.getDescendantItems(
                        (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
                    ).length === 0;
                if (doAddDefaultIntersectionView) {
                    groupDelegate.appendChild(
                        GroupRegistry.makeGroup(
                            GroupType.INTERSECTION_VIEW,
                            dataProviderManager,
                            colorSet.getNextColor(),
                        ),
                    );
                }

                return;
            }

            const parsedState = JSON.parse(serializedState);
            if (parsedState.dataProviderManager) {
                if (!dataProviderManager) {
                    return;
                }
                dataProviderManager.deserializeState(parsedState.dataProviderManager);
            }
        },
        [colorSet],
    );

    React.useEffect(
        function onMountEffect() {
            const newDataProviderManager = new DataProviderManager(
                props.workbenchSession,
                props.workbenchSettings,
                queryClient,
            );
            setDataProviderManager(newDataProviderManager);

            applyPersistedState(newDataProviderManager);

            return function onUnmountEffect() {
                newDataProviderManager.beforeDestroy();
            };
        },
        [setDataProviderManager, props.workbenchSession, props.workbenchSettings, queryClient, applyPersistedState],
    );

    React.useEffect(
        function onDataProviderManagerChangeEffect() {
            if (!dataProviderManager) {
                return;
            }

            persistDataProviderManagerState();

            const unsubscribeDataRev = dataProviderManager
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DataProviderManagerTopic.DATA_REVISION)(persistDataProviderManagerState);

            const unsubscribeExpands = dataProviderManager
                .getGroupDelegate()
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(GroupDelegateTopic.CHILDREN_EXPANSION_STATES)(persistDataProviderManagerState);

            return function onUnmountEffect() {
                unsubscribeDataRev();
                unsubscribeExpands();
            };
        },
        [dataProviderManager, props.workbenchSession, props.workbenchSettings, persistDataProviderManagerState],
    );

    React.useEffect(
        function onFieldIdentifierChangedEffect() {
            if (!dataProviderManager) {
                return;
            }
            dataProviderManager.updateGlobalSetting("fieldId", selectedFieldIdentifier.value);
        },
        [selectedFieldIdentifier, dataProviderManager],
    );

    function handleFieldIdentifierChange(fieldIdentifier: string | null) {
        setSelectedFieldIdentifier(fieldIdentifier);
    }

    return (
        <div className="h-full flex flex-col gap-1">
            <CollapsibleGroup title="Field" expanded>
                <FieldDropdown
                    ensembleSet={ensembleSet}
                    value={selectedFieldIdentifier.value}
                    onChange={handleFieldIdentifierChange}
                />
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
