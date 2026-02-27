import { type PublishSubscribe, PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

import type { StatusMessage, StatusWriter } from "./types/statusWriter";
import { StatusMessageType } from "./types/statusWriter";

export enum GenericStatusWriterTopic {
    UPDATE_MESSAGES = "update_messages",
}

export type GenericStatusWriterTopicPayload = {
    [GenericStatusWriterTopic.UPDATE_MESSAGES]: StatusMessage[];
};

export class GenericPubSubStatusWriter implements StatusWriter, PublishSubscribe<GenericStatusWriterTopicPayload> {
    private _pubSubDelegate = new PublishSubscribeDelegate<GenericStatusWriterTopicPayload>();
    private _messages: StatusMessage[] = [];
    private _source: string | null = null;

    constructor(source: string) {
        this._source = source;
    }

    private addMessage(message: StatusMessage) {
        this._messages.push(message);

        this._pubSubDelegate.notifySubscribers(GenericStatusWriterTopic.UPDATE_MESSAGES);
    }

    clear(): void {
        this._messages = [];

        this._pubSubDelegate.notifySubscribers(GenericStatusWriterTopic.UPDATE_MESSAGES);
    }
    getMessages(): StatusMessage[] {
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

    makeSnapshotGetter<T extends GenericStatusWriterTopic.UPDATE_MESSAGES>(
        topic: T,
    ): () => GenericStatusWriterTopicPayload[T] {
        return () => {
            if (topic === GenericStatusWriterTopic.UPDATE_MESSAGES) {
                return this._messages;
            }

            throw new Error(`Unknown topic : ${topic}`);
        };
    }
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<GenericStatusWriterTopicPayload> {
        return this._pubSubDelegate;
    }
}
