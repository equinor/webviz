import type React from "react";

import { Check } from "@mui/icons-material";

import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";

export interface DialogActionsProps {
    isLoading: boolean;
    disableDiscard: boolean;
    disableApply: boolean;
    hasDuplicatedDeltaEnsembles: boolean;
    onDiscard: () => void;
    onApply: () => void;
}

export const DialogActions: React.FC<DialogActionsProps> = (props: DialogActionsProps) => {
    const makeApplyButtonStartIcon = () => {
        if (props.isLoading) {
            return <CircularProgress size="small" />;
        }
        return <Check fontSize="small" />;
    };

    return (
        <div className="flex gap-4">
            <Button onClick={props.onDiscard} color="danger" disabled={props.disableDiscard}>
                Discard changes
            </Button>
            <div title={props.hasDuplicatedDeltaEnsembles ? "Duplicate Delta Ensembles (marked blue)" : ""}>
                <Button onClick={props.onApply} disabled={props.disableApply} startIcon={makeApplyButtonStartIcon()}>
                    {props.isLoading ? "Loading ensembles..." : "Apply"}
                </Button>
            </div>
        </div>
    );
};
