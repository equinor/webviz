import type React from "react";

import { Check } from "@mui/icons-material";

import { Button } from "@lib/newComponents/Button";
import { CircularProgress } from "@lib/newComponents/CircularProgress";

export interface DialogActionsProps {
    isLoading: boolean;
    disableDiscard: boolean;
    disableApply: boolean;
    onDiscard: () => void;
}

export const DialogActions: React.FC<DialogActionsProps> = (props: DialogActionsProps) => {
    const makeApplyButtonStartIcon = () => {
        if (props.isLoading) {
            return <CircularProgress size={16} />;
        }
        return <Check fontSize="small" />;
    };

    return (
        <div className="gap-x-xs flex">
            <Button onClick={props.onDiscard} tone="danger" variant="ghost" disabled={props.disableDiscard}>
                Discard changes
            </Button>
            <Button type="submit" disabled={props.disableApply}>
                {makeApplyButtonStartIcon()}
                {props.isLoading ? "Loading ensembles..." : "Apply"}
            </Button>
        </div>
    );
};
