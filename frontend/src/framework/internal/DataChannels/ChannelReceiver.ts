import type { KeyKind } from "@framework/types/dataChannnel";

import type { Channel } from "./Channel";
import type { ChannelManager } from "./ChannelManager";
import type { ContentIdStrings, Receiver } from "./types";

export interface ChannelReceiverDefinition {
    readonly idString: string;
    readonly displayName: string;
    readonly supportedKindsOfKeys: readonly KeyKind[];
    readonly supportsMultiContents?: boolean;
}

export enum ChannelReceiverNotificationTopic {
    CONTENTS_DATA_ARRAY_CHANGE = "contents-data-array-change",
    CHANNEL_CHANGE = "channel-change",
}

export class ChannelReceiver implements Receiver {
    private readonly _manager: ChannelManager;
    private readonly _idString: string;
    private readonly _displayName: string;
    private readonly _supportedKindsOfKeys: readonly KeyKind[];
    private readonly _supportsMultiContents: boolean;
    private _channel: Channel | null = null;
    private _contentIdStrings: string[] = [];
    private _subscribersMap: Map<ChannelReceiverNotificationTopic, Set<() => void>> = new Map();
    private _subscribedToAllContents = false;

    constructor(manager: ChannelManager, def: ChannelReceiverDefinition) {
        this._manager = manager;
        this._idString = def.idString;
        this._displayName = def.displayName;
        this._supportedKindsOfKeys = def.supportedKindsOfKeys;
        this._supportsMultiContents = def.supportsMultiContents ?? false;
    }

    getManager(): ChannelManager {
        return this._manager;
    }

    getChannel(): Channel | null {
        return this._channel;
    }

    getHasMultiContentSupport(): boolean {
        return this._supportsMultiContents;
    }

    getHasSubscribedToAllContents(): boolean {
        return this._subscribedToAllContents;
    }

    getContentIdStrings(): string[] {
        return this._contentIdStrings;
    }

    hasActiveSubscription(): boolean {
        return this._channel !== null;
    }

    getIdString(): string {
        return this._idString;
    }

    getDisplayName(): string {
        return this._displayName;
    }

    getSupportedKindsOfKeys(): readonly KeyKind[] {
        return this._supportedKindsOfKeys;
    }

    setContentSelection(contentIdStrings: ContentIdStrings): void {
        if (!this._channel) throw Error("No active channel subscription");

        if (contentIdStrings === "all") {
            const contents = this._supportsMultiContents
                ? this._channel.getContents()
                : this._channel.getContents().slice(0, 1);

            this._contentIdStrings = contents.map((p) => p.getIdString());
            this._subscribedToAllContents = true;
        } else {
            this._contentIdStrings = contentIdStrings;
            this._subscribedToAllContents = false;
        }
    }

    connectToChannel(channel: Channel, contentIdStrings: ContentIdStrings): void {
        if (this.hasActiveSubscription()) {
            this.disconnectFromCurrentChannel();
        }

        this._channel = channel;
        this._channel.connectReceiver(this);
        this.setContentSelection(contentIdStrings);

        this.notifySubscribers(ChannelReceiverNotificationTopic.CHANNEL_CHANGE);
    }

    onContentsArrayChange(): void {
        if (this._subscribedToAllContents) this.setContentSelection("all");
        else this.setContentSelection(this._contentIdStrings);
    }

    onContentDataArrayChange(): void {
        this.notifySubscribers(ChannelReceiverNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE);
    }

    onChannelAboutToBeRemoved(): void {
        this.resetChannelSettings();
    }

    disconnectFromCurrentChannel(): void {
        if (this._channel) {
            this._channel.disconnectReceiver(this);
            this.resetChannelSettings();
        }
    }

    private resetChannelSettings(): void {
        this._channel = null;
        this._contentIdStrings = [];
        this._subscribedToAllContents = false;
        this.notifySubscribers(ChannelReceiverNotificationTopic.CHANNEL_CHANGE);
    }

    subscribe(topic: ChannelReceiverNotificationTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: ChannelReceiverNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}
