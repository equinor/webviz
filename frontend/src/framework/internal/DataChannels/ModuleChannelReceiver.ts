import { ModuleChannel, ModuleChannelNotificationTopic } from "./ModuleChannel";
import { ModuleChannelManager } from "./ModuleChannelManager";

import { KeyKind } from "../../DataChannelTypes";

export interface ModuleChannelReceiverDefinition {
    readonly idString: string;
    readonly displayName: string;
    readonly supportedKindsOfKeys: readonly KeyKind[];
    readonly supportsMultiContents?: boolean;
}

export enum ModuleChannelReceiverNotificationTopic {
    ContentsDataArrayChange = "contents-data-array-change",
    ChannelChange = "channel-change",
}

export class ModuleChannelReceiver {
    private readonly _manager: ModuleChannelManager;
    private readonly _idString: string;
    private readonly _displayName: string;
    private readonly _supportedKindsOfKeys: readonly KeyKind[];
    private readonly _supportsMultiContents: boolean;
    private _channel: ModuleChannel | null = null;
    private _contentIdStrings: string[] = [];
    private _subscribersMap: Map<ModuleChannelReceiverNotificationTopic, Set<() => void>> = new Map();
    private _subscribedToAllContents: boolean = false;

    constructor({
        manager,
        idString,
        displayName,
        supportedKindsOfKeys,
        supportsMultiContents,
    }: {
        manager: ModuleChannelManager;
        idString: string;
        displayName: string;
        supportedKindsOfKeys: readonly KeyKind[];
        supportsMultiContents?: boolean;
    }) {
        this._manager = manager;
        this._idString = idString;
        this._displayName = displayName;
        this._supportedKindsOfKeys = supportedKindsOfKeys;
        this._supportsMultiContents = supportsMultiContents ?? false;

        this.handleChannelRemove = this.handleChannelRemove.bind(this);
        this.handleContentsDataArrayChange = this.handleContentsDataArrayChange.bind(this);
        this.handleContentsArrayChange = this.handleContentsArrayChange.bind(this);
    }

    getManager(): ModuleChannelManager {
        return this._manager;
    }

    subscribeToChannel(channel: ModuleChannel, contentIdStrings: string[] | "All"): void {
        if (this.hasActiveSubscription()) {
            this.unsubscribeFromCurrentChannel();
        }

        this._channel = channel;
        if (contentIdStrings === "All") {
            if (this._supportsMultiContents) {
                this._contentIdStrings = channel.getContents().map((p) => p.getIdString());
            } else {
                const firstProgram = channel.getContents().at(0);
                if (firstProgram) {
                    this._contentIdStrings = [firstProgram.getIdString()];
                } else {
                    this._contentIdStrings = [];
                }
            }
            this._subscribedToAllContents = true;

            this._channel.subscribe(ModuleChannelNotificationTopic.ContentsArrayChange, this.handleContentsArrayChange);
        } else {
            this._contentIdStrings = contentIdStrings;
            this._subscribedToAllContents = false;

            this._channel.unsubscribe(
                ModuleChannelNotificationTopic.ContentsArrayChange,
                this.handleContentsArrayChange
            );
        }

        this._channel.subscribe(ModuleChannelNotificationTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel.subscribe(
            ModuleChannelNotificationTopic.ContentsDataArraysChange,
            this.handleContentsDataArrayChange
        );
        this._channel.subscribe(ModuleChannelNotificationTopic.ContentsArrayChange, this.handleContentsDataArrayChange);

        this.notifySubscribers(ModuleChannelReceiverNotificationTopic.ChannelChange);
        this.notifySubscribers(ModuleChannelReceiverNotificationTopic.ContentsDataArrayChange);
    }

    getChannel(): ModuleChannel | null {
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
            this._channel.unsubscribe(ModuleChannelNotificationTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
            this._channel.unsubscribe(
                ModuleChannelNotificationTopic.ContentsDataArraysChange,
                this.handleContentsDataArrayChange
            );
            this._channel.unsubscribe(
                ModuleChannelNotificationTopic.ContentsArrayChange,
                this.handleContentsArrayChange
            );
            this._channel = null;
            this._contentIdStrings = [];
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

    subscribe(topic: ModuleChannelReceiverNotificationTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: ModuleChannelReceiverNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }

    private handleChannelRemove(): void {
        this._channel?.unsubscribe(ModuleChannelNotificationTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel?.unsubscribe(
            ModuleChannelNotificationTopic.ContentsDataArraysChange,
            this.handleContentsDataArrayChange
        );
        this._channel?.unsubscribe(ModuleChannelNotificationTopic.ContentsArrayChange, this.handleContentsArrayChange);
        this._channel = null;
        this._contentIdStrings = [];
    }

    private handleContentsDataArrayChange(): void {
        this.notifySubscribers(ModuleChannelReceiverNotificationTopic.ContentsDataArrayChange);
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
