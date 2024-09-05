import React from "react";

import { WellboreHeader_api } from "@api";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { IntersectionType } from "@framework/types/intersection";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { userSelectedFieldIdentifierAtom, userSelectedWellboreUuidAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedWellboreAtom } from "./atoms/derivedAtoms";
import { viewerHorizontalAtom } from "./atoms/persistedAtoms";
import { drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { LogTracks } from "./components/LogTracks";

import { InterfaceTypes } from "../interfaces";
import { useTrackedGlobalValue } from "../utils/hooks";

function useSyncedWellboreSetting(
    syncHelper: SyncSettingsHelper
): [typeof selectedWellboreHeader, typeof setSelectedWellboreHeader] {
    const localSetSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);
    // Global syncronization
    const globalIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");
    useTrackedGlobalValue(globalIntersection, () => {
        if (globalIntersection?.type === IntersectionType.WELLBORE) {
            localSetSelectedWellboreHeader(globalIntersection.uuid);
        }
    });

    function setSelectedWellboreHeader(wellboreUuid: string | null) {
        localSetSelectedWellboreHeader(wellboreUuid);

        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", {
            type: IntersectionType.WELLBORE,
            uuid: wellboreUuid ?? "",
        });
    }
    // Leave AFTER checking global, othwise the select menu will highlight the wrong value
    const selectedWellboreHeader = useAtomValue(selectedWellboreAtom);

    return [selectedWellboreHeader, setSelectedWellboreHeader];
}

export function Settings(props: ModuleSettingsProps<InterfaceTypes>) {
    // Utilities
    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    // Ensemble selections
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const selectedField = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedField = useSetAtom(userSelectedFieldIdentifierAtom);

    // Wellbore selection
    const wellboreHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);
    const [selectedWellboreHeader, setSelectedWellboreHeader] = useSyncedWellboreSetting(syncHelper);

    const handleWellboreSelectionChange = React.useCallback(
        function handleWellboreSelectionChange(uuids: string[]) {
            setSelectedWellboreHeader(uuids[0] ?? null);
        },
        [setSelectedWellboreHeader]
    );

    // Well log selection
    const [horizontal, setHorizontal] = useAtom(viewerHorizontalAtom);

    // Error messages
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const wellboreHeadersErrorStatus = usePropagateApiErrorToStatusWriter(wellboreHeaders, statusWriter) ?? "";

    return (
        <div className="flex flex-col h-full">
            <CollapsibleGroup title="Wellbore" expanded>
                <Label text="Field">
                    <FieldDropdown value={selectedField} ensembleSet={ensembleSet} onChange={setSelectedField} />
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

            {/* Spacer to slightly seperate the two collapsible items */}
            <div className="my-1" />

            {/* ? Shouldn't all base components allow you to pass a root className */}
            <CollapsibleGroup title="Well Log settings" expanded>
                {/* TODO: Other settings, like, color, vertical, scale, etc */}
                <Label text="Horizontal" position="left" labelClassName="!mb-0">
                    <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
                </Label>

                <div className="h-full"></div>
            </CollapsibleGroup>

            <div className="my-1" />

            <LogTracks statusWriter={statusWriter} />
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
