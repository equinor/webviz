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
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
        // Whenever a new ensemble set is set, we assume that the loading state has changed to false
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading: false });
    }
}
