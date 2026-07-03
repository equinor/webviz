import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleLoadingWarningInfoMap } from "@framework/internal/EnsembleSetLoader";
import { Dialog } from "@lib/components/Dialog";

export type EnsemblesLoadingWarningInfoDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    actions: React.ReactNode;
    ensembleLoadingWarningInfoMap: EnsembleLoadingWarningInfoMap;
    description?: React.ReactNode;
};

export function EnsemblesLoadingWarningInfoDialog(props: EnsemblesLoadingWarningInfoDialogProps) {
    return (
        <Dialog open={props.open} onClose={props.onClose} title={props.title} modal actions={props.actions}>
            <div className="flex flex-col space-y-4">
                {props.description}
                <div className="max-h-96 overflow-y-auto">
                    {Object.entries(props.ensembleLoadingWarningInfoMap).map(([ensembleIdentString, warningInfo]) => {
                        const isDeltaEnsemble = DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
                        const descriptionPrefix = isDeltaEnsemble ? "Delta Ensemble" : "Ensemble";
                        return (
                            <div key={ensembleIdentString} className="mb-4">
                                <div className="font-medium">
                                    {descriptionPrefix}: {warningInfo.displayName}
                                </div>
                                <ul className="list-disc list-inside">
                                    <li>{warningInfo.warningMessage}</li>
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Dialog>
    );
}
