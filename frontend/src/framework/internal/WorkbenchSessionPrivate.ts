import { FieldConfigSet } from "@framework/FieldConfigs";

import { EnsembleSet } from "../EnsembleSet";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    constructor() {
        super();
    }

    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setFieldConfigSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.FieldConfigSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
    }

    setFieldConfigSet(newFieldConfigSet: FieldConfigSet): void {
        this._fieldConfigSet = newFieldConfigSet;
    }
}
