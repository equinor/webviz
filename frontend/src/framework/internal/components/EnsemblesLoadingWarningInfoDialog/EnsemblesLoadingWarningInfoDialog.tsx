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
        <Dialog.Popup open={props.open} onOpenChange={props.onClose} modal>
            <Dialog.Header>
                <Dialog.Title>{props.title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="space-y-2xs flex flex-col">
                {props.description}
                <div className="max-h-96 overflow-y-auto">
                    {Object.entries(props.ensembleLoadingWarningInfoMap).map(([ensembleIdentString, warningInfo]) => {
                        const isDeltaEnsemble = DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
                        const descriptionPrefix = isDeltaEnsemble ? "Delta Ensemble" : "Ensemble";
                        return (
                            <div key={ensembleIdentString} className="mb-2xs">
                                <div className="font-medium">
                                    {descriptionPrefix}: {warningInfo.displayName}
                                </div>
                                <ul className="list-inside list-disc">
                                    <li>{warningInfo.warningMessage}</li>
                                </ul>
                            </div>
                        );
                    })}
                </div>
            </Dialog.Body>
            <Dialog.Actions>{props.actions}</Dialog.Actions>
        </Dialog.Popup>
    );
}
