import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";
import React from "react";

export type ActiveSessionRecoveryDialogProps = {
    workbench: Workbench;
};

export function ActiveSessionRecoveryDialog(props: ActiveSessionRecoveryDialogProps): React.ReactNode {
    const [isOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.ActiveSessionRecoveryDialogOpen);

    const activeSession = props.workbench.getWorkbenchSession();

    if (!isOpen) {
        return null;
    }

    function handleDiscard() {
        props.workbench.discardLocalStorageSession(activeSession.getId(), false);
    }

    function handleOpen() {
        props.workbench.openSessionFromLocalStorage(activeSession.getId());
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={false}
            title="Do you want to recover your session?"
            actions={
                <>
                    <Button onClick={handleOpen} variant="text">
                        Open
                    </Button>
                    <Button onClick={handleDiscard} variant="text" color="danger">
                        Discard
                    </Button>
                </>
            }
            width={800}
        >
            We found an unsaved version of your current session in your local storage. You can either discard it or open
            it to recover your work.
        </Dialog>
    );
}
