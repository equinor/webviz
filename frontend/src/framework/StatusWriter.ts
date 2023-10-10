import { ModuleContext } from "./ModuleContext";
import {
    ModuleInstanceStatusController,
    ModuleInstanceStatusControllerLogEntryType,
} from "./ModuleInstanceStatusController";

export class StatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(moduleContext: ModuleContext<any>) {
        this._statusController = moduleContext.getModuleInstanceStatusController();
        this._statusController.clearLog();
    }

    setLoading(isLoading: boolean): void {
        this._statusController.setLoading(isLoading);
    }

    addError(message: string): void {
        this._statusController.logMessage(message, ModuleInstanceStatusControllerLogEntryType.Error);
    }

    addWarning(message: string): void {
        this._statusController.logMessage(message, ModuleInstanceStatusControllerLogEntryType.Warning);
    }
}
