import {
    ModuleInstanceStatusController,
    ModuleInstanceStatusControllerLogEntry,
    ModuleInstanceStatusControllerLogEntryType,
} from "@framework/ModuleInstanceStatusController";

export enum ModuleInstaceStatusControllerTopics {
    LogChange = "log-change",
    LoadingStateChange = "loading-state-change",
}

export class ModuleInstanceStatusControllerPrivate extends ModuleInstanceStatusController {
    private _subscribers: Map<ModuleInstaceStatusControllerTopics, Set<() => void>>;

    constructor() {
        super();
        this._subscribers = new Map();
    }

    logMessage(message: string, type: ModuleInstanceStatusControllerLogEntryType): void {
        super.logMessage(message, type);
        this.notifySubscribers(ModuleInstaceStatusControllerTopics.LogChange);
    }

    getLogEntries(): readonly ModuleInstanceStatusControllerLogEntry[] {
        return this._logEntries;
    }

    clearLog(): void {
        super.clearLog();
        this.notifySubscribers(ModuleInstaceStatusControllerTopics.LogChange);
    }

    setLoading(isLoading: boolean): void {
        super.setLoading(isLoading);
        this.notifySubscribers(ModuleInstaceStatusControllerTopics.LoadingStateChange);
    }

    isLoading(): boolean {
        return this._isLoading;
    }

    subscribeToTopic(topic: ModuleInstaceStatusControllerTopics, cb: () => void): () => void {
        const subscribers = this._subscribers.get(topic) || new Set();
        subscribers.add(cb);
        this._subscribers.set(topic, subscribers);

        return () => {
            subscribers.delete(cb);
        };
    }

    private notifySubscribers(topic: ModuleInstaceStatusControllerTopics): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => {
                subscriber();
            });
        }
    }
}
