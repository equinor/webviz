import type React from "react";

import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import { Dialog } from "@lib/components/Dialog";
import { Button } from "@lib/newComponents/Button";

import { EnsemblesLoadingErrorInfoDialog } from "../../EnsemblesLoadingErrorInfoDialog";
import type { StateTuple } from "../_hooks";
import { AlertDialog } from "@lib/newComponents/AlertDialog";

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
                description="You have unsaved changes which will be lost. Are you sure you want to cancel?"
            />
            <EnsemblesLoadingErrorInfoDialog
                open={showEnsemblesLoadingErrorDialog}
                onClose={() => setShowLoadingErrorsDialog(false)}
                title={"Errors loading some ensembles — continue without them?"}
                description={
                    <div>
                        Some ensembles encountered errors during loading and setup and will be excluded. Do you want to
                        continue without them?
                    </div>
                }
                ensembleLoadingErrorInfoMap={props.ensembleLoadingErrorInfoMap}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => setShowLoadingErrorsDialog(false)} tone="neutral">
                            No, don&apos;t continue
                        </Button>
                        <Button onClick={props.onConfirmContinue} tone="accent">
                            Yes, continue
                        </Button>
                    </div>
                }
            />
        </>
    );
};
