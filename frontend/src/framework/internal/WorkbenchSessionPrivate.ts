import { EnsembleSet } from "../EnsembleSet";
import { EnsembleSetAtom } from "../GlobalAtoms";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this._globalAtomStore.set(EnsembleSetAtom, newEnsembleSet);
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
    }
}
