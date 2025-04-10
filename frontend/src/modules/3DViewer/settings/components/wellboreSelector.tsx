import React from "react";

import { Deselect, SelectAll } from "@mui/icons-material";

import type { WellboreHeader_api } from "@api";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import type { SelectOption } from "@lib/components/Select";
import { Select } from "@lib/components/Select";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";

export type WellboreSelectorProps = {
    wellboreHeaders: WellboreHeader_api[];
    selectedWellboreUuids: string[];
    onSelectedWellboreUuidsChange: (wellboreUuids: string[]) => void;
};

export function WellboreSelector(props: WellboreSelectorProps): React.ReactNode {
    const { onSelectedWellboreUuidsChange } = props;
    const availableWellboreStatuses = Array.from(new Set(props.wellboreHeaders.map((header) => header.wellboreStatus)));
    const availableWellborePurposes = Array.from(
        new Set(props.wellboreHeaders.map((header) => header.wellborePurpose)),
    );
    const [selectedWellboreStatuses, setSelectedWellboreStatuses] = useValidArrayState<string>({
        initialState: availableWellboreStatuses,
        validStateArray: availableWellboreStatuses,
    });
    const [selectedWellborePurposes, setSelectedWellborePurposes] = useValidArrayState<string>({
        initialState: availableWellborePurposes,
        validStateArray: availableWellborePurposes,
    });
    React.useEffect(() => {
        onSelectedWellboreUuidsChange(
            filterWellboreHeaders(props.wellboreHeaders, selectedWellboreStatuses, selectedWellborePurposes).map(
                (header) => header.wellboreUuid,
            ),
        );
    }, [selectedWellborePurposes, selectedWellboreStatuses, onSelectedWellboreUuidsChange, props.wellboreHeaders]);

    function handleSelectAll() {
        props.onSelectedWellboreUuidsChange(
            filterWellboreHeaders(props.wellboreHeaders, selectedWellboreStatuses, selectedWellborePurposes).map(
                (header) => header.wellboreUuid,
            ),
        );
    }
    function handleUnselectAll() {
        props.onSelectedWellboreUuidsChange([]);
    }
    function makeWellHeadersOptions(): SelectOption[] {
        return filterWellboreHeaders(props.wellboreHeaders, selectedWellboreStatuses, selectedWellborePurposes).map(
            (wellHeader) => ({
                label: wellHeader.uniqueWellboreIdentifier,
                value: wellHeader.wellboreUuid,
            }),
        );
    }

    return (
        <>
            <CollapsibleGroup title="Filter on well status and purpose">
                <div className="flex gap-2 grow items-center">
                    <Label text="Status">
                        <Select
                            options={makeWellboreStatusOptions(props.wellboreHeaders)}
                            value={selectedWellboreStatuses}
                            onChange={setSelectedWellboreStatuses}
                            size={5}
                            multiple
                        />
                    </Label>
                    <Label text="Purpose">
                        <Select
                            options={makeWellborePurposeOptions(props.wellboreHeaders)}
                            value={selectedWellborePurposes}
                            onChange={setSelectedWellborePurposes}
                            size={5}
                            multiple
                        />
                    </Label>
                </div>
            </CollapsibleGroup>

            <>
                <div className="flex gap-2 items-center">
                    <Button
                        onClick={handleSelectAll}
                        startIcon={<SelectAll />}
                        variant="text"
                        title="Select all"
                        size="small"
                    >
                        Select all
                    </Button>
                    <Button
                        onClick={handleUnselectAll}
                        startIcon={<Deselect />}
                        variant="text"
                        title="Unselect all"
                        size="small"
                    >
                        Unselect all
                    </Button>
                </div>
                <Select
                    options={makeWellHeadersOptions()}
                    value={props.selectedWellboreUuids ?? []}
                    onChange={props.onSelectedWellboreUuidsChange}
                    size={5}
                    filter
                    multiple
                    debounceTimeMs={600}
                />
            </>
        </>
    );
}

function makeWellborePurposeOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    const wellborePurposes = Array.from(new Set(wellHeaders.map((header) => header.wellborePurpose)));
    return wellborePurposes.map((purpose) => ({
        label: purpose,
        value: purpose,
    }));
}

function makeWellboreStatusOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    const wellboreStatuses = Array.from(new Set(wellHeaders.map((header) => header.wellboreStatus)));
    return wellboreStatuses.map((status) => ({
        label: status,
        value: status,
    }));
}

function filterWellboreHeaders(
    wellHeaders: WellboreHeader_api[],
    selectedWellboreStatuses: string[],
    selectedWellborePurposes: string[],
): WellboreHeader_api[] {
    return wellHeaders
        .filter((header) => selectedWellboreStatuses.includes(header.wellboreStatus))
        .filter((header) => selectedWellborePurposes.includes(header.wellborePurpose));
}
