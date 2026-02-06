import { type StatusMessage, type StatusWriter, StatusMessageType } from "@framework/types/statusWriter";
import { type PublishSubscribe, PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

export enum DependencyStatusTopic {
    UPDATE_MESSAGES = "update_messages",
}

export type DependencyStatusTopicPayload = {
    [DependencyStatusTopic.UPDATE_MESSAGES]: StatusMessage[];
};

/**  */
export class DependencyStatusWriter implements StatusWriter, PublishSubscribe<DependencyStatusTopicPayload> {
    private _messages: StatusMessage[] = [];
    private _pubSubDelegate = new PublishSubscribeDelegate<DependencyStatusTopicPayload>();

    getMessages() {
        return this._messages;
    }

    clear() {
        this._messages = [];
        this._pubSubDelegate.notifySubscribers(DependencyStatusTopic.UPDATE_MESSAGES);
    }

    // --- StatusWriter implementation ---
    addError(error: string): void {
        this._messages.push({ type: StatusMessageType.Error, message: error, source: "Dependency" });
        this._pubSubDelegate.notifySubscribers(DependencyStatusTopic.UPDATE_MESSAGES);
    }
    addWarning(warning: string): void {
        this._messages.push({ type: StatusMessageType.Warning, message: warning, source: "Dependency" });
        this._pubSubDelegate.notifySubscribers(DependencyStatusTopic.UPDATE_MESSAGES);
    }
    addInfo(message: string): void {
        this._messages.push({ type: StatusMessageType.Info, message: message, source: "Dependency" });
        this._pubSubDelegate.notifySubscribers(DependencyStatusTopic.UPDATE_MESSAGES);
    }

    // --- PublishSubscribe implementation ---
    makeSnapshotGetter<T extends DependencyStatusTopic.UPDATE_MESSAGES>(
        topic: T,
    ): () => DependencyStatusTopicPayload[T] {
        return () => {
            if (topic === DependencyStatusTopic.UPDATE_MESSAGES) {
                return this._messages;
            }

            throw new Error(`Unknown topic : ${topic}`);
        };
    }
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<DependencyStatusTopicPayload> {
        return this._pubSubDelegate;
    }
}
