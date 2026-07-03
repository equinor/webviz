import { GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { EnsemblesLoadingWarningInfoDialog } from "@framework/internal/components/EnsemblesLoadingWarningInfoDialog";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";

export type InitialEnsemblesLoadingWarningInfoDialogProps = {
    workbench: Workbench;
};

/**
 * Dialog that displays non-fatal ensemble loading warnings.
 *
 * Used to inform the user about issues that do not prevent an ensemble from loading, but that they
 * should be aware of - e.g. realization-level parameters missing from the ERT-managed standard result
 * (the old design matrix setup). The affected ensembles are still loaded.
 */
export function InitialEnsemblesLoadingWarningInfoDialog(props: InitialEnsemblesLoadingWarningInfoDialogProps) {
    const [isOpen, setIsOpen] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.EnsembleLoadingWarningInfoDialogOpen,
    );
    const ensembleLoadingWarningInfoMap = useGuiValue(
        props.workbench.getGuiMessageBroker(),
        GuiState.EnsemblesLoadingWarningInfoMap,
    );

    return (
        <EnsemblesLoadingWarningInfoDialog
            open={isOpen}
            onClose={() => setIsOpen(false)}
            title="Some parameters are missing - close to continue"
            description={
                <div>
                    Some ensembles have parameters that are present on realization level but missing from the
                    ERT-managed parameter set. These parameters will not appear in Webviz. Review the messages below and
                    close the dialog to continue.
                </div>
            }
            ensembleLoadingWarningInfoMap={ensembleLoadingWarningInfoMap}
            actions={
                <Button onClick={() => setIsOpen(false)} color="primary">
                    Close
                </Button>
            }
        />
    );
}
