import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";
import { Dialog } from "@lib/newComponents/Dialog";

export type EnsemblesLoadingErrorInfoDialogProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    actions: React.ReactNode;
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
    description?: React.ReactNode;
};

export function EnsemblesLoadingErrorInfoDialog(props: EnsemblesLoadingErrorInfoDialogProps) {
    return (
        <Dialog.Popup open={props.open} onOpenChange={props.onClose} modal>
            <Dialog.Header>
                <Dialog.Title>{props.title}</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body layoutClassName="flex flex-col">
                {props.description}
                <div className="gap-xs flex max-h-96 flex-col overflow-y-auto">
                    {Object.entries(props.ensembleLoadingErrorInfoMap).map(([ensembleIdentString, errorInfo]) => {
                        const isDeltaEnsemble = DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
                        const descriptionPrefix = isDeltaEnsemble ? "Delta Ensemble" : "Ensemble";
                        return (
                            <div key={ensembleIdentString}>
                                <div className="font-normal">
                                    {descriptionPrefix}: {errorInfo.displayName}
                                </div>
                                <ul className="list-inside list-disc">
                                    <li>{errorInfo.errorMessage}</li>
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
