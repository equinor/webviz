export enum ModuleInstanceStatusControllerLogEntryType {
    Warning = "warning",
    Error = "error",
}

export type ModuleInstanceStatusControllerLogEntry = {
    message: string;
    type: ModuleInstanceStatusControllerLogEntryType;
};

export class ModuleInstanceStatusController {
    protected _logEntries: ModuleInstanceStatusControllerLogEntry[];
    protected _isLoading: boolean;

    constructor() {
        this._logEntries = [];
        this._isLoading = false;
    }

    logMessage(message: string, type: ModuleInstanceStatusControllerLogEntryType): void {
        this._logEntries.push({
            message,
            type,
        });
    }

    clearLog(): void {
        this._logEntries = [];
    }

    setLoading(isLoading: boolean): void {
        this._isLoading = isLoading;
    }
}
