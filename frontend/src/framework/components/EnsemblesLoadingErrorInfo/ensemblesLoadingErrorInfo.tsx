import { DeltaEnsembleIdent } from "@framework/DeltaEnsembleIdent";
import type { EnsembleLoadingErrorInfoMap } from "@framework/internal/EnsembleSetLoader";

export type EnsemblesLoadingErrorInfoProps = {
    ensembleLoadingErrorInfoMap: EnsembleLoadingErrorInfoMap;
};

export function EnsemblesLoadingErrorInfo(props: EnsemblesLoadingErrorInfoProps): React.ReactNode {
    return (
        <div className="gap-vertical-xs flex max-h-96 flex-col overflow-y-auto">
            {Object.entries(props.ensembleLoadingErrorInfoMap).map(([ensembleIdentString, errorInfo]) => {
                const isDeltaEnsemble = DeltaEnsembleIdent.isValidEnsembleIdentString(ensembleIdentString);
                const descriptionPrefix = isDeltaEnsemble ? "Delta Ensemble" : "Ensemble";
                return (
                    <div key={ensembleIdentString}>
                        <div className="font-bolder">
                            {descriptionPrefix}: {errorInfo.displayName}
                        </div>
                        <ul className="list-inside list-disc">
                            <li>{errorInfo.errorMessage}</li>
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}
