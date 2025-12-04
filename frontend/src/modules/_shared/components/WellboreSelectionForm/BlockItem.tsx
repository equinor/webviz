import type React from "react";

import { ExpandLess, ExpandMore } from "@mui/icons-material";

import type { BlockGroup } from "./types";
import { WellItem } from "./WellItem";

interface BlockItemProps {
    blockGroup: BlockGroup;
    selectedWellboreUuids: Set<string>;
    expandedBlocks: Set<string>;
    expandedWells: Set<string>;
    onBlockToggle: (blockGroup: BlockGroup) => void;
    onBlockExpansionToggle: (blockName: string) => void;
    onWellToggle: (wellGroup: any) => void;
    onWellExpansionToggle: (wellUuid: string) => void;
    onWellboreToggle: (wellbore: any) => void;
}

export function BlockItem({
    blockGroup,
    selectedWellboreUuids,
    expandedBlocks,
    expandedWells,
    onBlockToggle,
    onBlockExpansionToggle,
    onWellToggle,
    onWellExpansionToggle,
    onWellboreToggle,
}: BlockItemProps): React.JSX.Element {
    const blockWellbores = blockGroup.wells.flatMap((wellGroup) => wellGroup.wellbores);
    const selectedCount = blockWellbores.filter((w) => selectedWellboreUuids.has(w.wellboreUuid)).length;
    const allSelected = selectedCount === blockWellbores.length;
    const someSelected = selectedCount > 0 && selectedCount < blockWellbores.length;
    const isExpanded = expandedBlocks.has(blockGroup.blockName);

    return (
        <div className="border-b border-gray-300 last:border-b-0">
            {/* Block Header */}
            <div className="bg-blue-50 border-b border-blue-200">
                <div className="flex items-center p-3">
                    <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => onBlockToggle(blockGroup)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-3"
                        ref={(input) => {
                            if (input) {
                                input.indeterminate = someSelected;
                            }
                        }}
                    />
                    <div
                        className="flex items-center justify-between flex-1 cursor-pointer hover:bg-blue-100 -m-3 p-3 rounded"
                        onClick={() => onBlockExpansionToggle(blockGroup.blockName)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onBlockExpansionToggle(blockGroup.blockName);
                                    }}
                                    className="p-1 hover:bg-blue-200 rounded"
                                    title={isExpanded ? "Collapse block" : "Expand block"}
                                >
                                    {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                </button>
                                <span className="font-semibold text-blue-900">{blockGroup.blockName}</span>
                            </div>
                            <div className="text-sm text-blue-700">
                                {blockGroup.totalWellbores} wellbore{blockGroup.totalWellbores !== 1 ? "s" : ""}
                                {selectedCount > 0 && ` (${selectedCount} selected)`}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Block completion indicators */}
                            {blockGroup.hasPerforations && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                                    Perforated
                                </span>
                            )}
                            {blockGroup.hasScreens && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-teal-100 text-teal-800">
                                    Screened
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Wells within Block */}
            {isExpanded && (
                <div>
                    {blockGroup.wells.map((wellGroup) => (
                        <WellItem
                            key={wellGroup.wellUuid}
                            wellGroup={wellGroup}
                            selectedWellboreUuids={selectedWellboreUuids}
                            expandedWells={expandedWells}
                            onWellToggle={onWellToggle}
                            onWellExpansionToggle={onWellExpansionToggle}
                            onWellboreToggle={onWellboreToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
