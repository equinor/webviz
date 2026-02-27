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
