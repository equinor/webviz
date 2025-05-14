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
} from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";

import type { Interfaces } from "../interfaces";

import { dataProviderManagerAtom, preferredViewLayoutAtom, userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";

export function Settings(props: ModuleSettingsProps<Interfaces>): JSX.Element {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();
    const colorSet = props.workbenchSettings.useColorSet();

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);

    const selectedFieldIdentifier = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedFieldIdentifier = useSetAtom(userSelectedFieldIdentifierAtom);
    const [preferredViewLayout, setPreferredViewLayout] = useAtom(preferredViewLayoutAtom);

    const persistState = React.useCallback(
        function persistDataProviderManagerState() {
            if (!dataProviderManager) {
                return;
            }

            const serializedState = {
                dataProviderManager: dataProviderManager.serializeState(),
                selectedFieldIdentifier,
                preferredViewLayout,
            };
            window.localStorage.setItem(
                `${props.settingsContext.getInstanceIdString()}-settings`,
                JSON.stringify(serializedState),
            );
        },
        [dataProviderManager, selectedFieldIdentifier, preferredViewLayout, props.settingsContext],
    );

    const applyPersistedState = React.useCallback(
        function applyPersistedState(dataProviderManager: DataProviderManager) {
            const serializedState = window.localStorage.getItem(
                `${props.settingsContext.getInstanceIdString()}-settings`,
            );
            if (!serializedState) {
                // Default view layout
                const groupDelegate = dataProviderManager.getGroupDelegate();

                const hasIntersectionView =
                    groupDelegate.getDescendantItems(
                        (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
                    ).length > 0;
                if (!hasIntersectionView) {
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
            if (parsedState.fieldIdentifier) {
                setSelectedFieldIdentifier(parsedState.fieldIdentifier);
            }
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
        [setSelectedFieldIdentifier, setPreferredViewLayout, props.settingsContext, colorSet],
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
            dataProviderManager.updateGlobalSetting("fieldId", selectedFieldIdentifier);
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
                    value={selectedFieldIdentifier}
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
