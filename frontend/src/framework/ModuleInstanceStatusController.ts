export enum StatusMessageType {
    Warning = "warning",
    Error = "error",
}

export enum StatusSource {
    View = "view",
    Settings = "settings",
}

export interface ModuleInstanceStatusController {
    addMessage(source: StatusSource, message: string, type: StatusMessageType): void;
    clearMessages(source: StatusSource): void;
    setLoading(isLoading: boolean): void;

    setDebugMessage(source: StatusSource, message: string): void;
    incrementReportedComponentRenderCount(source: StatusSource): void;

    reviseAndPublishState(): void;
}
