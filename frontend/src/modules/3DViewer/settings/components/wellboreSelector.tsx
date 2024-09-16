import React from "react";

import { WellboreHeader_api } from "@api";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import { useValidArrayState } from "@lib/hooks/useValidArrayState";
import { Deselect, SelectAll } from "@mui/icons-material";

export type WellboreSelectorProps = {
    wellboreHeaders: WellboreHeader_api[];
    selectedWellboreUuids: string[];
    onSelectedWellboreUuidsChange: (wellboreUuids: string[]) => void;
};

export function WellboreSelector(props: WellboreSelectorProps): React.ReactNode {
    const availableWellboreStatuses = Array.from(new Set(props.wellboreHeaders.map((header) => header.wellboreStatus)));
    const availableWellborePurposes = Array.from(
        new Set(props.wellboreHeaders.map((header) => header.wellborePurpose))
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
        props.onSelectedWellboreUuidsChange(
            props.wellboreHeaders
                .filter((header) => selectedWellborePurposes.includes(header.wellborePurpose))
                .filter((header) => selectedWellboreStatuses.includes(header.wellboreStatus))
                // .filter((header) => props.selectedWellboreUuids.includes(header.wellboreUuid))
                .map((header) => header.wellboreUuid)
        );
    }, [selectedWellborePurposes, selectedWellboreStatuses]);

    function handleSelectAll() {
        props.onSelectedWellboreUuidsChange(
            props.wellboreHeaders
                .filter((header) => selectedWellborePurposes.includes(header.wellborePurpose))
                .filter((header) => selectedWellboreStatuses.includes(header.wellboreStatus))
                .map((header) => header.wellboreUuid)
        );
    }
    function handleUnselectAll() {
        props.onSelectedWellboreUuidsChange([]);
    }
    function makeWellHeadersOptions(): SelectOption[] {
        return props.wellboreHeaders
            .filter((header) => selectedWellboreStatuses.includes(header.wellboreStatus))
            .filter((header) => selectedWellborePurposes.includes(header.wellborePurpose))
            .map((wellHeader) => ({
                label: wellHeader.uniqueWellboreIdentifier,
                value: wellHeader.wellboreUuid,
            }));
    }

    return (
        <>
            <CollapsibleGroup title="Filter on well status and purpose">
                <div className="flex gap-2 flex-grow items-center">
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
