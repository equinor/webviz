import React from "react";

import { WellboreHeader_api } from "@api";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { Intersection, IntersectionType } from "@framework/types/intersection";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue, useSetAtom } from "jotai";
import _ from "lodash";

import { userSelectedFieldIdentifierAtom, userSelectedWellboreUuidAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedWellboreHeaderAtom } from "./atoms/derivedAtoms";
import { availableFieldsQueryAtom, drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { TemplateTrackSettings } from "./components/TemplateTrackSettings";
import { ViewerSettings } from "./components/ViewerSettings";

import { InterfaceTypes } from "../interfaces";

function useSyncedWellboreSetting(
    syncHelper: SyncSettingsHelper
): [typeof selectedWellboreHeader, typeof setSelectedWellboreHeader] {
    const localSetSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);
    // Global syncronization
    const globalIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");
    const [prevGlobalIntersection, setPrevGlobalIntersection] = React.useState<Intersection | null>(null);

    if (!_.isEqual(prevGlobalIntersection, globalIntersection)) {
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

    // Field selection
    const availableFields = useAtomValue(availableFieldsQueryAtom)?.data ?? [];
    const selectedField = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedField = useSetAtom(userSelectedFieldIdentifierAtom);

    const fieldOptions = availableFields.map<DropdownOption>((f) => ({
        value: f.field_identifier,
        label: f.field_identifier,
    }));

    // Wellbore selection
    const wellboreHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);
    const [selectedWellboreHeader, setSelectedWellboreHeader] = useSyncedWellboreSetting(syncHelper);

    const handleWellboreSelectionChange = React.useCallback(
        function handleWellboreSelectionChange(uuids: string[]) {
            setSelectedWellboreHeader(uuids[0] ?? null);
        },
        [setSelectedWellboreHeader]
    );

    // Error messages
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const wellboreHeadersErrorStatus = usePropagateApiErrorToStatusWriter(wellboreHeaders, statusWriter) ?? "";

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
                <ViewerSettings statusWriter={statusWriter} />
            </CollapsibleGroup>

            <TemplateTrackSettings statusWriter={statusWriter} />
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
