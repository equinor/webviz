import { EnsembleSet } from "../EnsembleSet";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    constructor() {
        super();
    }

    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this._realizationFilterSet.synchronizeWithEnsembleSet(this._ensembleSet);
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }
}
