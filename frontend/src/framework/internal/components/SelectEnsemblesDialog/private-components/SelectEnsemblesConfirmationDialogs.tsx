import type React from "react";

import { EnsemblesLoadingErrorInfo } from "@framework/components/EnsemblesLoadingErrorInfo/ensemblesLoadingErrorInfo";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import { AlertDialog } from "@lib/newComponents/AlertDialog";

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
                title="Unsaved changes"
                primaryAction={{
                    label: "Yes, cancel",
                    onClick: props.onConfirmCancel,
                    tone: "danger",
                }}
                secondaryActions={[
                    {
                        label: "No, don't cancel",
                        onClick: () => setShowCancelDialog(false),
                        tone: "neutral",
                    },
                ]}
            >
                You have unsaved changes which will be lost. Are you sure you want to cancel?
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
                <div className="gap-vertical-sm flex flex-col">
                    Some ensembles encountered errors during loading and setup and will be excluded. Do you want to
                    continue without them?
                    <EnsemblesLoadingErrorInfo ensembleLoadingErrorInfoMap={props.ensembleLoadingErrorInfoMap} />
                </div>
            </AlertDialog>
        </>
    );
};
