import type React from "react";

import { ChevronRight } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";

import { EnsembleExplorerMode } from "../_hooks";

export type ExplorerTitleProps = {
    showExplorer: boolean;
    explorerMode: EnsembleExplorerMode | null;
    onClose: () => void;
};

export const ExplorerTitle: React.FC<ExplorerTitleProps> = ({ showExplorer, explorerMode, onClose }) => {
    let explorerTitle = "Add Ensembles";
    if (explorerMode === EnsembleExplorerMode.SELECT_OTHER_REFERENCE_ENSEMBLE) {
        explorerTitle = "Select Reference Ensemble";
    } else if (explorerMode === EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE) {
        explorerTitle = "Select Comparison Ensemble";
    }

    return (
        <div className="gap-horizontal-xs flex items-center">
            {showExplorer ? (
                <>
                    <Tooltip title="Back to selected ensembles" placement="bottom">
                        <button className="selectable text-header-md" onClick={onClose}>
                            Selected Ensembles
                        </button>
                    </Tooltip>
                    <ChevronRight />
                    <span className="text-header-md py-vertical-2xs px-horizontal-3xs">{explorerTitle}</span>
                </>
            ) : (
                <span className="text-header-md py-vertical-2xs px-horizontal-3xs">Selected Ensembles</span>
            )}
        </div>
    );
};
