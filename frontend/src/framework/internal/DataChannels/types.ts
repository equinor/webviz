export type ContentIdStrings = string[] | "all";

export interface Transmitter {
    connectReceiver(receiver: Receiver): void;

    disconnectReceiver(receiver: Receiver): void;
}

export interface Receiver {
    onContentsArrayChange(): void;

    onContentDataArrayChange(): void;

    onChannelAboutToBeRemoved(): void;
}
