import { ApiRequestOptions } from "src/api/core/ApiRequestOptions";

export enum StatusMessageType {
    Warning = "warning",
    Error = "error",
}

export enum StatusSource {
    View = "view",
    Settings = "settings",
}

export enum Origin {
    API = "api",
    MODULE = "module",
}

export type StatusMessage = {
    message: string;
    origin: Origin;
    endpoint?: string;
    request?: ApiRequestOptions;
};

export type StatusMessageWithType = StatusMessage & { type: StatusMessageType };

export interface ModuleInstanceStatusController {
    addMessage(source: StatusSource, message: StatusMessageWithType): void;

    clearHotMessageCache(source: StatusSource): void;
    setLoading(isLoading: boolean): void;

    setDebugMessage(source: StatusSource, message: string): void;
    incrementReportedComponentRenderCount(source: StatusSource): void;

    reviseAndPublishState(): void;
}
