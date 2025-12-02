import React from "react";

import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import type { SimplifiedWellboreHeader } from "@lib/utils/wellboreTypes";
import { Clear, SelectAll, Deselect } from "@mui/icons-material";

import { BlockItem } from "./BlockItem";
import { FilterControls } from "./FilterControls";
import { useWellboreData } from "./hooks/useWellboreData";
import type { WellboreSelectionDialogProps, FilterState, WellGroup, BlockGroup } from "./types";

export function WellboreSelectionDialog(props: WellboreSelectionDialogProps): React.ReactNode {
    const [filters, setFilters] = React.useState<FilterState>({
        searchText: "",
        purposes: [],
        statuses: [],
        completionTypes: [],
        completionDetails: [],
    });
    const [expandedWells, setExpandedWells] = React.useState<Set<string>>(new Set());
    const [expandedBlocks, setExpandedBlocks] = React.useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = React.useState(false);

    const {
        filteredBlockGroups,
        allFilteredWellbores,
        uniquePurposes,
        uniqueStatuses,
        uniqueCompletionTypes,
        uniqueCompletionDetails,
    } = useWellboreData(props.wellbores, filters);

    const selectedWellboreUuids = React.useMemo(
        () => new Set(props.selectedWellbores.map((w) => w.wellboreUuid)),
        [props.selectedWellbores],
    );

    const handleWellboreToggle = React.useCallback(
        (wellbore: SimplifiedWellboreHeader) => {
            const isSelected = selectedWellboreUuids.has(wellbore.wellboreUuid);
            let newSelection: SimplifiedWellboreHeader[];

            if (isSelected) {
                newSelection = props.selectedWellbores.filter((w) => w.wellboreUuid !== wellbore.wellboreUuid);
            } else {
                newSelection = [...props.selectedWellbores, wellbore];
            }

            props.onSelectionChange(newSelection);
        },
        [selectedWellboreUuids, props],
    );

    const handleWellToggle = React.useCallback(
        (wellGroup: WellGroup) => {
            const wellWellbores = wellGroup.wellbores;
            const allSelected = wellWellbores.every((w) => selectedWellboreUuids.has(w.wellboreUuid));

            let newSelection: SimplifiedWellboreHeader[];
            if (allSelected) {
                // Remove all wellbores from this well - use Set for O(1) lookup performance
                const wellboreUuidsToRemove = new Set(wellWellbores.map((w) => w.wellboreUuid));
                newSelection = props.selectedWellbores.filter((w) => !wellboreUuidsToRemove.has(w.wellboreUuid));
            } else {
                // Add all wellbores from this well that aren't already selected
                const toAdd = wellWellbores.filter((w) => !selectedWellboreUuids.has(w.wellboreUuid));
                newSelection = [...props.selectedWellbores, ...toAdd];
            }

            // Use setTimeout to ensure the UI updates immediately
            setTimeout(() => props.onSelectionChange(newSelection), 0);
        },
        [selectedWellboreUuids, props],
    );

    const handleSelectAll = () => {
        props.onSelectionChange(allFilteredWellbores);
    };

    const handleDeselectAll = () => {
        props.onSelectionChange([]);
    };

    const toggleWellExpansion = (wellUuid: string) => {
        const newExpanded = new Set(expandedWells);
        if (newExpanded.has(wellUuid)) {
            newExpanded.delete(wellUuid);
        } else {
            newExpanded.add(wellUuid);
        }
        setExpandedWells(newExpanded);
    };

    const toggleBlockExpansion = (blockName: string) => {
        const newExpanded = new Set(expandedBlocks);
        if (newExpanded.has(blockName)) {
            newExpanded.delete(blockName);
        } else {
            newExpanded.add(blockName);
        }
        setExpandedBlocks(newExpanded);
    };

    const handleBlockToggle = React.useCallback(
        (blockGroup: BlockGroup) => {
            const blockWellbores = blockGroup.wells.flatMap((wellGroup) => wellGroup.wellbores);
            const allSelected = blockWellbores.every((w) => selectedWellboreUuids.has(w.wellboreUuid));

            let newSelection: SimplifiedWellboreHeader[];
            if (allSelected) {
                // Remove all wellbores from this block - use Set for O(1) lookup performance
                const wellboreUuidsToRemove = new Set(blockWellbores.map((w) => w.wellboreUuid));
                newSelection = props.selectedWellbores.filter((w) => !wellboreUuidsToRemove.has(w.wellboreUuid));
            } else {
                // Add all wellbores from this block that aren't already selected
                const toAdd = blockWellbores.filter((w) => !selectedWellboreUuids.has(w.wellboreUuid));
                newSelection = [...props.selectedWellbores, ...toAdd];
            }

            // Use setTimeout to ensure the UI updates immediately
            setTimeout(() => props.onSelectionChange(newSelection), 0);
        },
        [selectedWellboreUuids, props],
    );

    const filterOptions = React.useMemo(
        () => ({
            purposes: uniquePurposes.map((purpose) => {
                const count = props.wellbores.filter((w) => w.wellborePurpose === purpose).length;
                return {
                    value: purpose,
                    label: `${purpose} (${count})`,
                };
            }),
            statuses: uniqueStatuses.map((status) => {
                const count = props.wellbores.filter((w) => w.wellboreStatus === status).length;
                return {
                    value: status,
                    label: `${status} (${count})`,
                };
            }),
            completionTypes: uniqueCompletionTypes.map((type) => {
                const count = props.wellbores.filter((w) => {
                    const hasScreens = w.perforationAndScreens.includes("Screen");
                    const hasPerforations = w.perforationAndScreens.some((item) => item !== "Screen");
                    if (type === "perforated") return hasPerforations;
                    if (type === "screened") return hasScreens;
                    if (type === "none") return !hasPerforations && !hasScreens;
                    return false;
                }).length;
                return {
                    value: type,
                    label: `${type.charAt(0).toUpperCase() + type.slice(1)} (${count})`,
                };
            }),
            completionDetails: uniqueCompletionDetails.map((detail) => {
                const count = props.wellbores.filter((w) => w.perforationAndScreens.includes(detail)).length;
                return {
                    value: detail,
                    label: `${detail} (${count})`,
                };
            }),
        }),
        [props.wellbores, uniquePurposes, uniqueStatuses, uniqueCompletionTypes, uniqueCompletionDetails],
    );

    const uniqueValues = React.useMemo(
        () => ({
            purposes: uniquePurposes,
            statuses: uniqueStatuses,
            completionTypes: uniqueCompletionTypes,
            completionDetails: uniqueCompletionDetails,
        }),
        [uniquePurposes, uniqueStatuses, uniqueCompletionTypes, uniqueCompletionDetails],
    );

    const dialogActions = (
        <div className="flex gap-2 justify-end">
            <Button variant="outlined" onClick={props.onClose}>
                Cancel
            </Button>
            <Button variant="contained" onClick={props.onClose}>
                Apply ({props.selectedWellbores.length} selected)
            </Button>
        </div>
    );

    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            title="Select Wellbores"
            width="1200px"
            height="80vh"
            showCloseCross
            actions={dialogActions}
        >
            <div className="flex flex-col h-full" style={{ height: "calc(80vh - 140px)" }}>
                {/* Filter Controls */}
                <div className="flex-shrink-0 flex flex-col gap-2 mb-4">
                    <FilterControls
                        filters={filters}
                        setFilters={setFilters}
                        showFilters={showFilters}
                        setShowFilters={setShowFilters}
                        filterOptions={filterOptions}
                        uniqueValues={uniqueValues}
                    />

                    {/* Quick Actions */}
                    <div className="flex gap-2 items-center">
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<SelectAll fontSize="small" />}
                            onClick={handleSelectAll}
                        >
                            Select All ({allFilteredWellbores.length})
                        </Button>
                        <Button
                            size="small"
                            variant="text"
                            startIcon={<Deselect fontSize="small" />}
                            onClick={handleDeselectAll}
                        >
                            Deselect All
                        </Button>
                        {(filters.searchText ||
                            filters.purposes.length > 0 ||
                            filters.statuses.length > 0 ||
                            filters.completionTypes.length > 0 ||
                            filters.completionDetails.length > 0) && (
                            <Button
                                size="small"
                                variant="text"
                                startIcon={<Clear fontSize="small" />}
                                onClick={() =>
                                    setFilters({
                                        searchText: "",
                                        purposes: [],
                                        statuses: [],
                                        completionTypes: [],
                                        completionDetails: [],
                                    })
                                }
                                className="text-gray-500 hover:text-gray-700"
                            >
                                Clear All Filters
                            </Button>
                        )}
                        <div className="ml-auto text-sm text-gray-600">
                            {props.selectedWellbores.length} of {props.wellbores.length} wellbores selected
                            {allFilteredWellbores.length !== props.wellbores.length &&
                                ` (${allFilteredWellbores.length} filtered)`}
                        </div>
                    </div>
                </div>

                {/* Wellbores List */}
                <div className="flex-1 min-h-0 overflow-y-auto border border-gray-300 rounded">
                    {filteredBlockGroups.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No wellbores match the current filters</div>
                    ) : (
                        <div>
                            {filteredBlockGroups.map((blockGroup) => (
                                <BlockItem
                                    key={blockGroup.blockName}
                                    blockGroup={blockGroup}
                                    selectedWellboreUuids={selectedWellboreUuids}
                                    expandedBlocks={expandedBlocks}
                                    expandedWells={expandedWells}
                                    onBlockToggle={handleBlockToggle}
                                    onBlockExpansionToggle={toggleBlockExpansion}
                                    onWellToggle={handleWellToggle}
                                    onWellExpansionToggle={toggleWellExpansion}
                                    onWellboreToggle={handleWellboreToggle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Dialog>
    );
}

export type { WellboreSelectionDialogProps };
