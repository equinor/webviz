import { cloneDeep } from "lodash";

export enum StatusMessageType {
    Warning = "warning",
    Error = "error",
}

export enum StatusSource {
    View = "view",
    Settings = "settings",
}

export type StatusMessage = {
    source: StatusSource;
    message: string;
    type: StatusMessageType;
};

export type StatusControllerState = {
    messages: StatusMessage[];
    loading: boolean;
    viewDebugMessage: string;
    settingsDebugMessage: string;
    viewRenderCount: number | null;
    settingsRenderCount: number | null;
};

export class ModuleInstanceStatusController {
    protected _stateCandidates: StatusControllerState;
    protected _state: StatusControllerState;

    constructor() {
        this._state = {
            messages: [],
            loading: false,
            viewDebugMessage: "",
            settingsDebugMessage: "",
            viewRenderCount: null,
            settingsRenderCount: null,
        };
        this._stateCandidates = cloneDeep(this._state);
    }

    addMessage(source: StatusSource, message: string, type: StatusMessageType): void {
        this._stateCandidates.messages.push({
            source,
            message,
            type,
        });
    }

    clearMessages(source: StatusSource): void {
        this._stateCandidates.messages = this._stateCandidates.messages.filter((msg) => msg.source !== source);
    }

    setLoading(isLoading: boolean): void {
        this._stateCandidates.loading = isLoading;
    }

    setDebugMessage(source: StatusSource, message: string): void {
        if (source === StatusSource.View) {
            this._stateCandidates.viewDebugMessage = message;
        }
        if (source === StatusSource.Settings) {
            this._stateCandidates.settingsDebugMessage = message;
        }
    }

    incrementReportedComponentRenderCount(source: StatusSource): void {
        if (source === StatusSource.View) {
            if (this._stateCandidates.viewRenderCount === null) {
                this._stateCandidates.viewRenderCount = 0;
            }
            this._stateCandidates.viewRenderCount++;
        }
        if (source === StatusSource.Settings) {
            if (this._stateCandidates.settingsRenderCount === null) {
                this._stateCandidates.settingsRenderCount = 0;
            }
            this._stateCandidates.settingsRenderCount++;
        }
    }

    reviseState(): void {
        this._state = cloneDeep(this._stateCandidates);
    }
}
