import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { useColorSet } from "@framework/WorkbenchSettings";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import type { DataProviderManager } from "@modules/_shared/DataProviderFramework/framework/DataProviderManager/DataProviderManager";
import { Group } from "@modules/_shared/DataProviderFramework/framework/Group/Group";
import { GroupRegistry } from "@modules/_shared/DataProviderFramework/groups/GroupRegistry";
import { GroupType } from "@modules/_shared/DataProviderFramework/groups/groupTypes";
import { usePersistedDataProviderManager } from "@modules/_shared/DataProviderFramework/hooks/usePersistedDataProviderManager";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

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

    const firstColorRef = React.useRef(colorSet.getFirstColor());

    const setDataProviderManagerAndAddFirstView = React.useCallback(
        function setDataProviderManagerAndAddFirstView(manager: DataProviderManager) {
            const groupDelegate = manager.getGroupDelegate();

            const doAddDefaultIntersectionView =
                groupDelegate.getDescendantItems(
                    (item) => item instanceof Group && item.getGroupType() === GroupType.INTERSECTION_VIEW,
                ).length === 0;
            if (doAddDefaultIntersectionView) {
                groupDelegate.appendChild(
                    GroupRegistry.makeGroup(GroupType.INTERSECTION_VIEW, manager, firstColorRef.current),
                );
            }

            setDataProviderManager(manager);
        },
        [setDataProviderManager],
    );

    usePersistedDataProviderManager({
        workbenchSession: props.workbenchSession,
        workbenchSettings: props.workbenchSettings,
        queryClient,
        serializedState: dataProviderSerializedState,
        setSerializedState: setDataProviderSerializedState,
        setDataProviderManager: setDataProviderManagerAndAddFirstView,
    });

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

    const selectedFieldIdentifierAnnotations = useMakePersistableFixableAtomAnnotations(selectedFieldIdentifierAtom);

    return (
        <div className="h-full flex flex-col gap-1">
            <CollapsibleGroup title="Field" expanded>
                <SettingWrapper annotations={selectedFieldIdentifierAnnotations}>
                    <FieldDropdown
                        ensembleSet={ensembleSet}
                        value={selectedFieldIdentifier.value}
                        onChange={handleFieldIdentifierChange}
                    />
                </SettingWrapper>
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
