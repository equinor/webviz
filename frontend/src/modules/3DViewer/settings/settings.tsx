import React from "react";

import { useQueryClient } from "@tanstack/react-query";
import { useAtom } from "jotai";

import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { Setting } from "@lib/components/Setting";
import { usePersistedDataProviderManager } from "@modules/_shared/DataProviderFramework/hooks/usePersistedDataProviderManager";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";

import { dataProviderManagerAtom, dataProviderStateAtom } from "./atoms/baseAtoms";
import { fieldIdentifierAtom } from "./atoms/persistableFixableAtoms";
import { DataProviderManagerWrapper } from "./components/dataProviderManagerWrapper";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const queryClient = useQueryClient();

    const [dataProviderManager, setDataProviderManager] = useAtom(dataProviderManagerAtom);
    const [dataProviderState, setDataProviderState] = useAtom(dataProviderStateAtom);

    const [fieldIdentifier, setFieldIdentifier] = useAtom(fieldIdentifierAtom);

    usePersistedDataProviderManager({
        setDataProviderManager,
        serializedState: dataProviderState,
        setSerializedState: setDataProviderState,
        workbenchSession: props.workbenchSession,
        workbenchSettings: props.workbenchSettings,
        dashboardSettingsService: props.dashboardSettingsService,
        queryClient,
    });

    React.useEffect(
        function onFieldIdentifierChangedEffect() {
            if (!dataProviderManager) {
                return;
            }
            dataProviderManager.updateGlobalSetting("fieldId", fieldIdentifier.value, fieldIdentifier.isValidInContext);
        },
        [fieldIdentifier, dataProviderManager],
    );

    // The effect above passes the field on to the data provider manager, with its validity
    function handleFieldChange(fieldId: string | null) {
        setFieldIdentifier(fieldId);
    }

    const fieldIdentifierAnnotations = useMakePersistableFixableAtomAnnotations(fieldIdentifierAtom);

    return (
        <div className="gap-y-xs px-xs py-xs flex h-full flex-col">
            <Setting.Panel>
                <Setting.Field label="Field" annotations={fieldIdentifierAnnotations}>
                    <FieldDropdown
                        ensembleSet={ensembleSet}
                        onChange={handleFieldChange}
                        value={fieldIdentifier.value}
                    />
                </Setting.Field>
            </Setting.Panel>
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
