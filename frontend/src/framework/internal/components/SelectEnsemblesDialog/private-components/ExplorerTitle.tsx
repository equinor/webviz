import type React from "react";

import { ChevronRight } from "@mui/icons-material";

import { EnsembleExplorerMode } from "../_hooks";
import { Heading } from "@lib/newComponents/Typography/compositions";
import { Button } from "@lib/newComponents/Button";

export type ExplorerTitleProps = {
    showExplorer: boolean;
    explorerMode: EnsembleExplorerMode | null;
    onClose: () => void;
};

export const ExplorerTitle: React.FC<ExplorerTitleProps> = ({ showExplorer, explorerMode, onClose }) => {
    let explorerTitle = "Add Ensemble";
    if (explorerMode === EnsembleExplorerMode.SELECT_OTHER_REFERENCE_ENSEMBLE) {
        explorerTitle = "Select Reference Ensemble";
    } else if (explorerMode === EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE) {
        explorerTitle = "Select Comparison Ensemble";
    }

    return (
        <div className="gap-horizontal-xs flex items-center">
            {showExplorer ? (
                <>
                    <button className="selectable text-header-md" onClick={onClose}>
                        Selected Ensembles
                    </button>
                    <ChevronRight />
                    <span className="text-header-md py-vertical-2xs px-horizontal-3xs">{explorerTitle}</span>
                </>
            ) : (
                <span className="text-header-md py-vertical-2xs px-horizontal-3xs">Selected Ensembles</span>
            )}
        </div>
    );
};
