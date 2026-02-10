import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

/**
 * Different levels of status-messages
 */
export enum StatusMessageType {
    Info = "info",
    Warning = "warning",
    Error = "error",
}

/**
 * A simple data-structure for stored status-messages.
 */
export type StatusMessage = {
    /** The message type/level */
    type: StatusMessageType;
    /** The content of the message */
    message: string;
    /** The source of the message (i.e. the caller) */
    source: string | null;
};

/**
 * A status-writer is a simple interface that accepts status-messages of different levels
 * of importance. Messages are usually strings, but other data-types can also be used
 */
export interface StatusWriter<MessageType = string> {
    /**
     * Registers an info-level message
     */
    addInfo(info: MessageType): void;
    /**
     * Registers an error-level message
     */
    addError(error: MessageType): void;
    /**
     * Registers a warning-level message
     */
    addWarning(warning: MessageType): void;
}

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
