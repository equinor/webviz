import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

export type RecoveryDialogProps = {
    workbench: Workbench;
};

export function RecoveryDialog(props: RecoveryDialogProps): React.ReactNode {
    const [isOpen, setIsOpen] = useGuiState(props.workbench.getGuiMessageBroker(), GuiState.RecoveryDialogOpen);

    if (!isOpen) {
        return null;
    }

    function handleOpen() {
        props.workbench.openSessionFromLocalStorage();
    }

    function handleDiscard() {
        props.workbench.discardLocalStorageSession();
    }

    function handleCancel() {
        setIsOpen(false);
    }

    return (
        <Dialog
            open={isOpen}
            modal
            showCloseCross={false}
            title="Do you want to recover your session?"
            actions={
                <>
                    <Button onClick={handleCancel} variant="text">
                        Cancel
                    </Button>
                    <Button onClick={handleDiscard} variant="text" color="danger">
                        Discard session
                    </Button>
                    <Button onClick={handleOpen} variant="text">
                        Open session
                    </Button>
                </>
            }
        >
            We found a previous session with unsaved changes. You can either open it or discard the changes.
        </Dialog>
    );
}
