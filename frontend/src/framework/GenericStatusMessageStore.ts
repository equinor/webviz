import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import type {
    PublishSubScribeStatusMessageStore,
    StatusMessage,
    StatusMessageStoreTopicPayload,
    StatusWriter,
} from "./types/statusWriter";
import { StatusMessageType, StatusMessageStoreTopic } from "./types/statusWriter";

export class GenericStatusMessageStore implements StatusWriter, PublishSubScribeStatusMessageStore {
    private readonly _source: string;

    private _pubSubDelegate = new PublishSubscribeDelegate<StatusMessageStoreTopicPayload>();
    private _messages: StatusMessage[] = [];

    constructor(source: string) {
        this._source = source;
    }

    private addMessage(message: StatusMessage) {
        this._messages.push(message);

        this._pubSubDelegate.notifySubscribers(StatusMessageStoreTopic.STATUS_MESSAGES);
    }

    clear(): void {
        this._messages = [];

        this._pubSubDelegate.notifySubscribers(StatusMessageStoreTopic.STATUS_MESSAGES);
    }
    getMessages(): readonly StatusMessage[] {
        return this._messages;
    }

    addInfo(info: string): void {
        const infoMessage: StatusMessage = { type: StatusMessageType.Info, source: this._source, message: info };

        this.addMessage(infoMessage);
    }

    addWarning(warning: string): void {
        const warningMessage: StatusMessage = {
            type: StatusMessageType.Warning,
            source: this._source,
            message: warning,
        };

        this.addMessage(warningMessage);
    }

    addError(error: string): void {
        const errorMessage: StatusMessage = { type: StatusMessageType.Error, source: this._source, message: error };

        this.addMessage(errorMessage);
    }

    makeSnapshotGetter<T extends StatusMessageStoreTopic.STATUS_MESSAGES>(
        topic: T,
    ): () => StatusMessageStoreTopicPayload[T] {
        return () => {
            if (topic === StatusMessageStoreTopic.STATUS_MESSAGES) {
                return this._messages;
            }

            throw new Error(`Unknown topic : ${topic}`);
        };
    }
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<StatusMessageStoreTopicPayload> {
        return this._pubSubDelegate;
    }
}
