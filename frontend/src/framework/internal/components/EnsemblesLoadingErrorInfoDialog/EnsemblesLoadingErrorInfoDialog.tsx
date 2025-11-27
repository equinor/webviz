import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import { Dialog } from "@lib/components/Dialog";

export type EnsemblesLoadingErrorInfoDialogProps = {
    open: boolean;
    onClose: () => void;
    actions: React.ReactNode;
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
    description?: React.ReactNode;
};

export function EnsemblesLoadingErrorInfoDialog(props: EnsemblesLoadingErrorInfoDialogProps) {
    return (
        <Dialog
            open={props.open}
            onClose={props.onClose}
            title="Ensemble load and setup errors"
            modal
            actions={props.actions}
        >
            <div className="flex flex-col space-y-4">
                {props.description}
                <div className="max-h-96 overflow-y-auto">
                    {Object.entries(props.ensembleLoadingErrorInfoMap).map(([ensembleIdentString, errorInfo]) => {
                        const isDeltaEnsemble = DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
                        const descriptionPrefix = isDeltaEnsemble ? "Delta Ensemble" : "Ensemble";
                        return (
                            <div key={ensembleIdentString} className="mb-4">
                                <div className="font-medium">
                                    {descriptionPrefix}: {errorInfo.displayName}
                                </div>
                                <ul className="list-disc list-inside">
                                    <li>{errorInfo.errorMessage}</li>
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Dialog>
    );
}
