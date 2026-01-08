import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { EnsemblesLoadingErrorInfoDialog } from "@framework/internal/components/EnsemblesLoadingErrorInfoDialog";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";

import { useActiveSession } from "../ActiveSessionBoundary";

export type InitialEnsemblesLoadingErrorInfoDialogProps = {
    workbench: Workbench;
};

/**
 * Dialog that displays ensemble loading errors for a session or snapshot.
 *
 * This dialog is intended to show only once when ensembles fail to load during initial
 * session/snapshot creation or when loading from local storage. It is controlled by GUI
 * state to prevent repeated displays of the same errors.
 */
export function InitialEnsemblesLoadingErrorInfoDialog(props: InitialEnsemblesLoadingErrorInfoDialogProps) {
    const activeSession = useActiveSession();

    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.EnsembleLoadingErrorInfoDialogOpen,
    );
    const ensembleLoadingErrorInfoMap = useGuiValue(
        props.workbench.getGuiMessageBroker(),
        GuiState.EnsemblesLoadingErrorInfoMap,
    );

    return (
        <EnsemblesLoadingErrorInfoDialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            title="Error loading some ensembles - close to continue"
            description={
                <div>
                    Errors occurred while loading and setting up some of the ensembles for this{" "}
                    {activeSession.isSnapshot() ? "snapshot" : "session"}. They will be excluded. Review the messages
                    below and close the dialog to continue.
                </div>
            }
            ensembleLoadingErrorInfoMap={ensembleLoadingErrorInfoMap}
            actions={
                <Button onClick={() => setIsOpen(false)} color="primary">
                    Close
                </Button>
            }
        />
    );
}
