import { WellboreHeader_api } from "@api";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { viewerHorizontalAtom } from "@modules/3DViewer/settings/atoms/baseAtoms";
import { usePropagateApiErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import { useAtom, useAtomValue, useSetAtom } from "jotai";

import { userSelectedFieldIdentifierAtom, userSelectedWellboreUuidAtom } from "./atoms/baseAtoms";
import { selectedFieldIdentifierAtom, selectedWellboreAtom } from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom } from "./atoms/queryAtoms";
import { CurveTracks } from "./components/CurveTracks";

// import { LogSettings } from "./components/LogSettings";
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

    const [horizontal, setHorizontal] = useAtom(viewerHorizontalAtom);

    // Error messages
    const statusWriter = useSettingsStatusWriter(props.settingsContext);
    const wellboreHeadersErrorStatus = usePropagateApiErrorToStatusWriter(wellboreHeaders, statusWriter) ?? "";

    return (
        <div className="flex flex-col h-full">
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
            <CollapsibleGroup title="Well Log settings" expanded>
                {/* TODO: Other settings, like, color, vertical, scale, etc */}
                <Label text="Horizontal" position="left" labelClassName="!mb-0">
                    <Checkbox checked={horizontal} onChange={(e, checked) => setHorizontal(checked)} />
                </Label>

                <div className="h-full"></div>
            </CollapsibleGroup>

            <div className="my-1" />

            <CurveTracks statusWriter={statusWriter} />
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
