import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import type { WellboreHeader_api } from "@api";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import type { SyncSettingsHelper } from "@framework/SyncSettings";
import { SyncSettingKey, useRefStableSyncSettingsHelper } from "@framework/SyncSettings";
import type { Intersection } from "@framework/types/intersection";
import { IntersectionType } from "@framework/types/intersection";
import { WorkbenchSessionTopic } from "@framework/WorkbenchSession";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { InterfaceTypes } from "../interfaces";

import { dataProviderManagerAtom } from "./atoms/baseAtoms";
import { selectedWellboreHeaderAtom } from "./atoms/derivedAtoms";
import { selectedFieldIdentAtom, selectedWellboreUuidAtom } from "./atoms/persistableFixableAtoms";
import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { ProviderManagerComponentWrapper } from "./components/ProviderManagerComponentWrapper";
import { ViewerSettings } from "./components/ViewerSettings";

function useSyncedWellboreSetting(
    syncHelper: SyncSettingsHelper,
): [typeof selectedWellboreHeader, typeof setSelectedWellboreHeader] {
    const localSetSelectedWellboreHeader = useSetAtom(selectedWellboreUuidAtom);
    // Global syncronization
    const globalIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");
    const [prevGlobalIntersection, setPrevGlobalIntersection] = React.useState<Intersection | null>(null);

    if (!isEqual(prevGlobalIntersection, globalIntersection)) {
        setPrevGlobalIntersection(globalIntersection);

        if (globalIntersection?.type === IntersectionType.WELLBORE) {
            localSetSelectedWellboreHeader(globalIntersection.uuid);
        }
    }

    function setSelectedWellboreHeader(wellboreUuid: string | null) {
        localSetSelectedWellboreHeader(wellboreUuid);

        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", {
            type: IntersectionType.WELLBORE,
            uuid: wellboreUuid ?? "",
        });
    }
    // Leave AFTER checking global, othwise the select menu will highlight the wrong value
    const selectedWellboreHeader = useAtomValue(selectedWellboreHeaderAtom);

    return [selectedWellboreHeader, setSelectedWellboreHeader];
}

export function Settings(props: ModuleSettingsProps<InterfaceTypes>) {
    // Utilities
    const syncHelper = useRefStableSyncSettingsHelper({
        workbenchServices: props.workbenchServices,
        moduleContext: props.settingsContext,
    });
    const providerManager = useAtomValue(dataProviderManagerAtom);
    const ensembleSet = usePublishSubscribeTopicValue(props.workbenchSession, WorkbenchSessionTopic.ENSEMBLE_SET);
    const allFields = useAtomValue(availableFieldsQueryAtom).data ?? [];

    // Field selection
    const [selectedField, setSelectedField] = useAtom(selectedFieldIdentAtom);

    // Wellbore selection
    const wellboreHeadersQuery = useAtomValue(drilledWellboreHeadersQueryAtom);
    const [selectedWellboreHeader, setSelectedWellboreHeader] = useSyncedWellboreSetting(syncHelper);

    const handleWellboreSelectionChange = React.useCallback(
        function handleWellboreSelectionChange(uuids: string[]) {
            setSelectedWellboreHeader(uuids[0] ?? null);
        },
        [setSelectedWellboreHeader],
    );

    // Error messages
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const wellboreHeadersErrorMessage = usePropagateQueryErrorToStatusWriter(wellboreHeadersQuery, statusWriter) ?? "";

    React.useEffect(() => {
        providerManager?.updateGlobalSetting("fieldId", selectedField.value);
    }, [providerManager, selectedField.value]);

    React.useEffect(() => {
        providerManager?.updateGlobalSetting("wellboreUuid", selectedWellboreHeader?.wellboreUuid ?? null);
    }, [providerManager, selectedWellboreHeader]);

    const fieldSettingAnnotations = useMakePersistableFixableAtomAnnotations(selectedFieldIdentAtom);
    const wellboreSettingAnnotations = useMakePersistableFixableAtomAnnotations(selectedWellboreUuidAtom);

    return (
        <div className="flex flex-col h-full gap-1">
            <CollapsibleGroup title="Wellbore" expanded contentClassName="flex flex-col gap-3">
                <SettingWrapper label="Field" annotations={fieldSettingAnnotations}>
                    <FieldDropdown
                        value={selectedField.value}
                        ensembleSet={ensembleSet}
                        fallbackFieldList={allFields.map((f) => f.fieldIdentifier)}
                        onChange={setSelectedField}
                    />
                </SettingWrapper>

                <SettingWrapper
                    label="Wellbore"
                    annotations={wellboreSettingAnnotations}
                    errorOverlay={wellboreHeadersErrorMessage}
                >
                    <Select
                        options={makeWellHeaderOptions(wellboreHeadersQuery.data ?? [])}
                        value={selectedWellboreHeader ? [selectedWellboreHeader.wellboreUuid] : []}
                        onChange={handleWellboreSelectionChange}
                        filter
                        size={5}
                    />
                </SettingWrapper>
            </CollapsibleGroup>

            <CollapsibleGroup title="Log viewer settings" expanded>
                <ViewerSettings />
            </CollapsibleGroup>

            <ProviderManagerComponentWrapper
                workbenchSession={props.workbenchSession}
                workbenchSettings={props.workbenchSettings}
            />
        </div>
    );
}

// ? Duplicate from Intersection module code. Move to shared utility file?
function makeWellHeaderOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        value: wellHeader.wellboreUuid,
        label: wellHeader.uniqueWellboreIdentifier,
    }));
}
