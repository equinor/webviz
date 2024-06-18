import React from "react";

import { WellboreHeader_api } from "@api";
import { Button } from "@lib/components/Button";
import { Select, SelectOption } from "@lib/components/Select";
import { Deselect, SelectAll } from "@mui/icons-material";

export type WellboreSelectorProps = {
    wellboreHeaders: WellboreHeader_api[];
    selectedWellboreUuids: string[];
    onSelectedWellboreUuidsChange: (wellboreUuids: string[]) => void;
};

export function WellboreSelector(props: WellboreSelectorProps): React.ReactNode {
    function handleSelectAll() {
        props.onSelectedWellboreUuidsChange(props.wellboreHeaders.map((header) => header.wellboreUuid));
    }
    function handleUnselectAll() {
        props.onSelectedWellboreUuidsChange([]);
    }
    return (
        <div className="flex flex-col gap-2 text-sm">
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
                options={makeWellHeadersOptions(props.wellboreHeaders)}
                value={props.selectedWellboreUuids ?? []}
                onChange={props.onSelectedWellboreUuidsChange}
                size={5}
                filter
                multiple
                debounceTimeMs={600}
            />
        </div>
    );
}
function makeWellHeadersOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        label: wellHeader.uniqueWellboreIdentifier,
        value: wellHeader.wellboreUuid,
    }));
}
