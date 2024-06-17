import { AtomStoreMaster } from "@framework/AtomStoreMaster";

import { EnsembleSet } from "../EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom } from "../GlobalAtoms";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    private _atomStoreMaster: AtomStoreMaster;

    constructor(atomStoreMaster: AtomStoreMaster) {
        super(atomStoreMaster);
        this._atomStoreMaster = atomStoreMaster;
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._realizationFilterSet);
    }

    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._realizationFilterSet.synchronizeWithEnsembleSet(newEnsembleSet);
        this._ensembleSet = newEnsembleSet;
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, newEnsembleSet);
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }
}
