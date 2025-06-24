import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Dialog } from "@lib/components/Dialog";

export type UnsavedSessionChangesDialogProps = {
    workbench: Workbench;
};

export function UnsavedSessionChangesDialog(props: UnsavedSessionChangesDialogProps): React.ReactNode {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SessionHasUnsavedChanges,
    );

    if (!hasUnsavedChanges) {
        return null;
    }

    function handleCancel() {
        setHasUnsavedChanges(false);
    }

    function handleSave() {
        props.workbench.saveCurrentSession();
    }

    function handleDiscard() {
        props.workbench.closeCurrentSession();
    }

    return (
        <Dialog
            open={hasUnsavedChanges}
            modal
            showCloseCross={false}
            title="You have unsaved changes"
            actions={
                <>
                    <Button onClick={handleCancel} variant="text">
                        Cancel
                    </Button>
                    <Button onClick={handleDiscard} variant="text" color="danger">
                        Discard changes
                    </Button>
                    <Button onClick={handleSave} variant="text" color="success">
                        Save changes
                    </Button>
                </>
            }
        >
            Do you want to save or discard your changes?
        </Dialog>
    );
}
