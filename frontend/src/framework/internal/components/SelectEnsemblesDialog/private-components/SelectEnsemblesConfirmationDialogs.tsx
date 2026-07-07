import type React from "react";

import { EnsemblesLoadingErrorInfo } from "@framework/components/EnsemblesLoadingErrorInfo/ensemblesLoadingErrorInfo";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import { AlertDialog } from "@lib/components/AlertDialog";

import type { StateTuple } from "../_hooks";

export type SelectEnsemblesConfirmationDialogsProps = {
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
    showCancelDialogState: StateTuple<boolean>;
    showLoadingErrorsDialogState: StateTuple<boolean>;
    onConfirmCancel: () => void;
    onConfirmContinue: () => void;
};

/**
 * Component that manages confirmation dialogs for the SelectEnsemblesDialog.
 *
 * Handles cancel confirmation and loading errors confirmation.
 */
export const SelectEnsemblesConfirmationDialogs: React.FC<SelectEnsemblesConfirmationDialogsProps> = (props) => {
    const [showCancelDialog, setShowCancelDialog] = props.showCancelDialogState;
    const [showEnsemblesLoadingErrorDialog, setShowLoadingErrorsDialog] = props.showLoadingErrorsDialogState;

    return (
        <>
            <AlertDialog
                open={showCancelDialog}
                onOpenChange={(open) => setShowCancelDialog(open)}
                title="Close without saving changes?"
                primaryAction={{
                    label: "Cancel",
                    onClick: () => setShowCancelDialog(false),
                    tone: "neutral",
                }}
                secondaryActions={[
                    {
                        label: "Yes, close without saving",
                        onClick: props.onConfirmCancel,
                        tone: "danger",
                    },
                ]}
            >
                You have unsaved changes which will be lost. Are you sure you want to close without saving?
            </AlertDialog>
            <AlertDialog
                open={showEnsemblesLoadingErrorDialog}
                onOpenChange={() => setShowLoadingErrorsDialog(false)}
                title="Error loading some ensembles - continue without them?"
                primaryAction={{
                    label: "No, don't continue",
                    onClick: () => setShowLoadingErrorsDialog(false),
                    tone: "accent",
                }}
                secondaryActions={[{ label: "Yes, continue", onClick: props.onConfirmContinue, tone: "danger" }]}
            >
                <div className="gap-y-sm flex flex-col">
                    Some ensembles encountered errors during loading and setup and will be excluded. Do you want to
                    continue without them?
                    <EnsemblesLoadingErrorInfo ensembleLoadingErrorInfoMap={props.ensembleLoadingErrorInfoMap} />
                </div>
            </AlertDialog>
        </>
    );
};
