import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { EnsembleIdent } from "@framework/EnsembleIdent";

import { EnsembleSet } from "../EnsembleSet";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "../GlobalAtoms";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    private _atomStoreMaster: AtomStoreMaster;

    constructor(atomStoreMaster: AtomStoreMaster) {
        super();
        this._atomStoreMaster = atomStoreMaster;
    }

    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this._realizationFilterSet.synchronizeWithEnsembleSet(this._ensembleSet);
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, newEnsembleSet);
        this._atomStoreMaster.setAtomValue(
            EnsembleRealizationFilterFunctionAtom,
            () => (ensembleIdent: EnsembleIdent) =>
                this._realizationFilterSet.getRealizationFilterForEnsembleIdent(ensembleIdent).getFilteredRealizations()
        );
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }
}
