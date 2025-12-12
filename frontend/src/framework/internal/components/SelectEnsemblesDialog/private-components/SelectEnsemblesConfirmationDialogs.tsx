import type React from "react";

import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

import { EnsemblesLoadingErrorInfoDialog } from "../../EnsemblesLoadingErrorInfoDialog";
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
            <Dialog
                open={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
                title="Unsaved changes"
                modal
                actions={
                    <div className="flex gap-4">
                        <Button onClick={() => setShowCancelDialog(false)}>No, don&apos;t cancel</Button>
                        <Button onClick={props.onConfirmCancel} color="danger">
                            Yes, cancel
                        </Button>
                    </div>
                }
            >
                You have unsaved changes which will be lost. Are you sure you want to cancel?
            </Dialog>
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
                        <Button onClick={() => setShowLoadingErrorsDialog(false)} color="secondary">
                            No, don&apos;t continue
                        </Button>
                        <Button onClick={props.onConfirmContinue} color="primary">
                            Yes, continue
                        </Button>
                    </div>
                }
            />
        </>
    );
};
