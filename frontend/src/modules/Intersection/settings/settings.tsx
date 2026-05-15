import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { usePersistedDataProviderManager } from "@modules/_shared/DataProviderFramework/hooks/usePersistedDataProviderManager";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import type { Interfaces } from "../interfaces";

import { dataProviderManagerAtom, dataProviderSerializedStateAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom } from "./atoms/persistableFixableAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";

export function Settings(props: ModuleSettingsProps<Interfaces>): JSX.Element {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [selectedFieldIdentifier, setSelectedFieldIdentifier] = useAtom(selectedFieldIdentifierAtom);

    const [dataProviderSerializedState, setDataProviderSerializedState] = useAtom(dataProviderSerializedStateAtom);

    usePersistedDataProviderManager({
        workbenchSession: props.workbenchSession,
        workbenchSettings: props.workbenchSettings,
        queryClient,
        serializedState: dataProviderSerializedState,
        setSerializedState: setDataProviderSerializedState,
        setDataProviderManager,
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
