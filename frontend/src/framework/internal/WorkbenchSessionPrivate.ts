import { EnsembleSet } from "../EnsembleSet";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    constructor() {
        super();
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
    }
}
