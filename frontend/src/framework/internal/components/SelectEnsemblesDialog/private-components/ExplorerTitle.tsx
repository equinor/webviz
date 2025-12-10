import type React from "react";

import { ChevronRight } from "@mui/icons-material";

import { EnsembleExplorerMode } from "../_hooks";

export type ExplorerTitleProps = {
    showExplorer: boolean;
    explorerMode: EnsembleExplorerMode | null;
    onClose: () => void;
};

export const ExplorerTitle: React.FC<ExplorerTitleProps> = ({ showExplorer, explorerMode, onClose }) => {
    if (!showExplorer) {
        return <div className="pl-2 text-xl">Selected Ensembles</div>;
    }

    let explorerTitle = "Add Ensemble";
    if (explorerMode === EnsembleExplorerMode.SELECT_OTHER_REFERENCE_ENSEMBLE) {
        explorerTitle = "Select Reference Ensemble";
    } else if (explorerMode === EnsembleExplorerMode.SELECT_OTHER_COMPARISON_ENSEMBLE) {
        explorerTitle = "Select Comparison Ensemble";
    }

    return (
        <div className="flex items-center space-x-1">
            <span
                className="pl-2 text-slate-400 text-xl hover:bg-gray-100 hover:text-slate-500 rounded-md cursor-pointer"
                onClick={onClose}
            >
                Selected Ensembles
                <ChevronRight />
            </span>
            <span className="text-black text-xl"> {explorerTitle}</span>
        </div>
    );
};
