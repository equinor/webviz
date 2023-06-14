import { EnsembleSet } from "../EnsembleSet";
import { Workbench } from "../Workbench";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    constructor(workbench: Workbench) {
        super(workbench);
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
    }
}
