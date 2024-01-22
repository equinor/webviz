import { Channel, ChannelNotificationTopic } from "./Channel";
import { ChannelManager } from "./ChannelManager";

import { KeyKind } from "../../DataChannelTypes";

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

export class ChannelReceiver {
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

        this.handleChannelRemove = this.handleChannelRemove.bind(this);
        this.handleContentsDataArrayChange = this.handleContentsDataArrayChange.bind(this);
        this.handleContentsArrayChange = this.handleContentsArrayChange.bind(this);
    }

    getManager(): ChannelManager {
        return this._manager;
    }

    subscribeToChannel(channel: Channel, contentIdStrings: string[] | "All"): void {
        if (this.hasActiveSubscription()) {
            this.unsubscribeFromCurrentChannel();
        }

        this._channel = channel;
        if (contentIdStrings === "All") {
            if (this._supportsMultiContents) {
                this._contentIdStrings = channel.getContents().map((p) => p.getIdString());
            } else {
                const firstContent = channel.getContents().at(0);
                if (firstContent) {
                    this._contentIdStrings = [firstContent.getIdString()];
                } else {
                    this._contentIdStrings = [];
                }
            }
            this._subscribedToAllContents = true;

            this._channel.subscribe(ChannelNotificationTopic.CONTENTS_ARRAY_CHANGE, this.handleContentsArrayChange);
        } else {
            this._contentIdStrings = contentIdStrings;
            this._subscribedToAllContents = false;

            this._channel.unsubscribe(ChannelNotificationTopic.CONTENTS_ARRAY_CHANGE, this.handleContentsArrayChange);
        }

        this._channel.subscribe(ChannelNotificationTopic.CHANNEL_ABOUT_TO_BE_REMOVED, this.handleChannelRemove);
        this._channel.subscribe(
            ChannelNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE,
            this.handleContentsDataArrayChange
        );
        this._channel.subscribe(ChannelNotificationTopic.CONTENTS_ARRAY_CHANGE, this.handleContentsDataArrayChange);

        this.notifySubscribers(ChannelReceiverNotificationTopic.CHANNEL_CHANGE);
        this.notifySubscribers(ChannelReceiverNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE);
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

    unsubscribeFromCurrentChannel(): void {
        if (this._channel) {
            this._channel.unsubscribe(ChannelNotificationTopic.CHANNEL_ABOUT_TO_BE_REMOVED, this.handleChannelRemove);
            this._channel.unsubscribe(
                ChannelNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE,
                this.handleContentsDataArrayChange
            );
            this._channel.unsubscribe(ChannelNotificationTopic.CONTENTS_ARRAY_CHANGE, this.handleContentsArrayChange);
            this._channel = null;
            this._contentIdStrings = [];
            this.notifySubscribers(ChannelReceiverNotificationTopic.CHANNEL_CHANGE);
        }
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

    private handleChannelRemove(): void {
        this._channel?.unsubscribe(ChannelNotificationTopic.CHANNEL_ABOUT_TO_BE_REMOVED, this.handleChannelRemove);
        this._channel?.unsubscribe(
            ChannelNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE,
            this.handleContentsDataArrayChange
        );
        this._channel?.unsubscribe(ChannelNotificationTopic.CONTENTS_ARRAY_CHANGE, this.handleContentsArrayChange);
        this._channel = null;
        this._contentIdStrings = [];
    }

    private handleContentsDataArrayChange(): void {
        this.notifySubscribers(ChannelReceiverNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE);
    }

    private handleContentsArrayChange(): void {
        if (this._supportsMultiContents) {
            this._contentIdStrings = this._channel?.getContents().map((p) => p.getIdString()) ?? [];
        } else {
            const firstContent = this._channel?.getContents().at(0);
            if (firstContent) {
                this._contentIdStrings = [firstContent.getIdString()];
            } else {
                this._contentIdStrings = [];
            }
        }
    }
}
