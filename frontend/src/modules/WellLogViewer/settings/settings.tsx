import React from "react";

import { useAtomValue, useSetAtom } from "jotai";
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
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { InterfaceTypes } from "../interfaces";

import { providerManagerAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedWellboreHeaderAtom } from "./atoms/derivedAtoms";
import { userSelectedFieldIdentAtom, userSelectedWellboreUuidAtom } from "./atoms/persistedAtoms";
import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { ProviderManagerComponentWrapper } from "./components/ProviderManagerComponentWrapper";
import { ViewerSettings } from "./components/ViewerSettings";

function useSyncedWellboreSetting(
    syncHelper: SyncSettingsHelper,
): [typeof selectedWellboreHeader, typeof setSelectedWellboreHeader] {
    const localSetSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);
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
    const providerManager = useAtomValue(providerManagerAtom);

    // Field selection
    const availableFields = useAtomValue(availableFieldsQueryAtom)?.data ?? [];
    const selectedField = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedField = useSetAtom(userSelectedFieldIdentAtom);

    const fieldOptions = availableFields.map<DropdownOption>((f) => ({
        value: f.fieldIdentifier,
        label: f.fieldIdentifier,
    }));

    // Wellbore selection
    const wellboreHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);
    const [selectedWellboreHeader, setSelectedWellboreHeader] = useSyncedWellboreSetting(syncHelper);

    const handleWellboreSelectionChange = React.useCallback(
        function handleWellboreSelectionChange(uuids: string[]) {
            setSelectedWellboreHeader(uuids[0] ?? null);
        },
        [setSelectedWellboreHeader],
    );

    // Error messages
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const wellboreHeadersErrorStatus = usePropagateApiErrorToStatusWriter(wellboreHeaders, statusWriter) ?? "";

    React.useEffect(() => {
        providerManager?.updateGlobalSetting("fieldId", selectedField);
    }, [providerManager, selectedField]);

    React.useEffect(() => {
        providerManager?.updateGlobalSetting("wellboreUuid", selectedWellboreHeader?.wellboreUuid ?? null);
    }, [providerManager, selectedWellboreHeader]);

    return (
        <div className="flex flex-col h-full gap-1">
            <CollapsibleGroup title="Wellbore" expanded>
                <Label text="Field">
                    <Dropdown
                        value={selectedField}
                        options={fieldOptions}
                        disabled={fieldOptions.length === 0}
                        onChange={setSelectedField}
                    />
                </Label>

                <Label text="Wellbore" wrapperClassName="mt-4">
                    <PendingWrapper isPending={wellboreHeaders.isFetching} errorMessage={wellboreHeadersErrorStatus}>
                        {/* 3DViewer has a WellboreSelector, should that one be made shared, and used here? */}
                        <Select
                            options={makeWellHeaderOptions(wellboreHeaders.data ?? [])}
                            value={selectedWellboreHeader ? [selectedWellboreHeader.wellboreUuid] : []}
                            onChange={handleWellboreSelectionChange}
                            filter
                            size={5}
                        />
                    </PendingWrapper>
                </Label>
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
