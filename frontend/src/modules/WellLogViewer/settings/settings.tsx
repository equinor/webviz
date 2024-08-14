// import React from "react";
// Types
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtomValue, useSetAtom } from "jotai";
import { WellboreHeader } from "src/api/models/WellboreHeader";

import { userSelectedFieldIdentifierAtom, userSelectedWellboreUuidAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedWellboreAtom } from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { LogSettings } from "./components/LogSettings";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

function useSyncedChangeHandler(setter: (...args: any[]) => any, valueTransform?: (v: any) => void) {
    return function handleValueChange(newValue: unknown) {
        console.debug(newValue);

        if (valueTransform) newValue = valueTransform(newValue);

        setter(newValue);
        // TODO: Setup syncing
    };
}

function takeFirstEl(els: any[]) {
    console.debug(els);

    return els[0] ?? null;
}

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>) {
    // Ensemble selections
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const selectedField = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedField = useSetAtom(userSelectedFieldIdentifierAtom);
    const handleEnsembleSelectionChange = useSyncedChangeHandler(setSelectedField);

    // const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    // const setSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);
    // const handleEnsembleSelectionChange = useSyncedChangeHandler(setSelectedEnsembleIdent, takeFirstEl);

    // Wellbore selection
    const wellboreHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);

    const selectedWellboreHeader = useAtomValue(selectedWellboreAtom);
    const setSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);
    const handleWellboreSelectionChange = useSyncedChangeHandler(setSelectedWellboreHeader, takeFirstEl);

    // Well log selection

    // Error messages
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const wellboreHeadersErrorStatus = usePropagateApiErrorToStatusWriter(wellboreHeaders, statusWriter) ?? "";

    return (
        <div className="flex flex-col flex-grow min-h-0">
            <CollapsibleGroup title="Wellbore" expanded>
                <Label text="Field">
                    <FieldDropdown
                        value={selectedField}
                        ensembleSet={ensembleSet}
                        onChange={handleEnsembleSelectionChange}
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

            {/* Spacer to slightly seperate the two collapsible items */}
            <div className="my-1" />

            {/* ? Shouldn't all base components allow you to pass a root className */}
            <CollapsibleGroup title="Well Log" expanded>
                <LogSettings statusWriter={statusWriter} />
            </CollapsibleGroup>
        </div>
    );
}

// function getQueryErrorMessage(queryAtom : Atom)

// ? Duplicate from Intersection module code. Move to shared utility file?
function makeWellHeaderOptions(wellHeaders: WellboreHeader[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        value: wellHeader.wellboreUuid,
        label: wellHeader.uniqueWellboreIdentifier,
    }));
}
