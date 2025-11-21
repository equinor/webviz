import React from "react";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import type { WellboreHeader_api } from "@api";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import type { Intersection } from "@framework/types/intersection";
import { IntersectionType } from "@framework/types/intersection";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import type { DropdownOption } from "@lib/components/Dropdown";
import { Dropdown } from "@lib/components/Dropdown";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { SettingWrapper } from "@lib/components/SettingWrapper";
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
    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);
    const providerManager = useAtomValue(dataProviderManagerAtom);

    // Field selection
    const [selectedField, setSelectedField] = useAtom(selectedFieldIdentAtom);
    const availableFieldsQuery = useAtomValue(availableFieldsQueryAtom);
    const availableFields = availableFieldsQuery?.data ?? [];

    const fieldOptions = availableFields.map<DropdownOption>((f) => ({
        value: f.fieldIdentifier,
        label: f.fieldIdentifier,
    }));

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
    const availableFieldsErrorMessage = usePropagateQueryErrorToStatusWriter(availableFieldsQuery, statusWriter) ?? "";
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
                <SettingWrapper
                    label="Field"
                    annotations={fieldSettingAnnotations}
                    errorOverlay={availableFieldsErrorMessage}
                >
                    <Dropdown
                        value={selectedField.value}
                        options={fieldOptions}
                        disabled={fieldOptions.length === 0}
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
