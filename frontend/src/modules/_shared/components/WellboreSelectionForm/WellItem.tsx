import type React from "react";

import { ExpandLess, ExpandMore } from "@mui/icons-material";

import type { WellGroup } from "./types";
import { WellboreItem } from "./WellboreItem";

interface WellItemProps {
    wellGroup: WellGroup;
    selectedWellboreUuids: Set<string>;
    expandedWells: Set<string>;
    onWellToggle: (wellGroup: WellGroup) => void;
    onWellExpansionToggle: (wellUuid: string) => void;
    onWellboreToggle: (wellbore: any) => void;
}

export function WellItem({
    wellGroup,
    selectedWellboreUuids,
    expandedWells,
    onWellToggle,
    onWellExpansionToggle,
    onWellboreToggle,
}: WellItemProps): React.JSX.Element {
    const isExpanded = expandedWells.has(wellGroup.wellUuid);
    const wellWellbores = wellGroup.wellbores;
    const selectedCount = wellWellbores.filter((w) => selectedWellboreUuids.has(w.wellboreUuid)).length;
    const allSelected = selectedCount === wellWellbores.length;
    const someSelected = selectedCount > 0 && selectedCount < wellWellbores.length;

    return (
        <div className="border-b border-gray-200 last:border-b-0">
            {/* Well Header */}
            <div
                className="flex items-center p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer select-none"
                onClick={() => onWellToggle(wellGroup)}
            >
                <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={() => onWellToggle(wellGroup)}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-3"
                    ref={(input) => {
                        if (input) {
                            input.indeterminate = someSelected;
                        }
                    }}
                />
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <div className="font-medium text-base">{wellGroup.uniqueWellIdentifier}</div>
                        {/* Completion type badges */}
                        {wellGroup.hasPerforations && (
                            <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">Perf</span>
                        )}
                        {wellGroup.hasScreens && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Screen</span>
                        )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        {wellWellbores.length} wellbore{wellWellbores.length !== 1 ? "s" : ""}
                        {selectedCount > 0 && ` (${selectedCount} selected)`}
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onWellExpansionToggle(wellGroup.wellUuid);
                    }}
                    className="p-1 hover:bg-gray-200 rounded"
                    title={isExpanded ? "Collapse wellbores" : "Expand wellbores"}
                >
                    {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </button>
            </div>

            {/* Wellbores */}
            {isExpanded && (
                <div className="bg-white">
                    {wellWellbores.map((wellbore) => (
                        <WellboreItem
                            key={wellbore.wellboreUuid}
                            wellbore={wellbore}
                            isSelected={selectedWellboreUuids.has(wellbore.wellboreUuid)}
                            onWellboreToggle={onWellboreToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
