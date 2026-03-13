import type { KeyKind } from "@framework/types/dataChannnel";

import type { ChannelContentDefinition } from "./ChannelContent";
import { ChannelContent } from "./ChannelContent";
import type { ChannelManager } from "./ChannelManager";
import type { Transmitter, Receiver } from "./types";

export interface ChannelDefinition {
    readonly idString: string;
    readonly displayName: string;
    readonly kindOfKey: KeyKind;
}

export enum ChannelNotificationTopic {
    RECEIVERS_ARRAY_CHANGED = "receivers-array-changed",
}

export type ChannelNotificationTopicPayload = {
    [ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED]: Receiver[];
};

export class Channel implements Transmitter {
    private _idString: string;
    private _displayName: string;
    private _kindOfKey: KeyKind;
    private _manager: ChannelManager;
    private _contents: ChannelContent[] = [];

    private _receivers: Receiver[] = [];
    private _subscribersMap: Map<ChannelNotificationTopic, Set<() => void>> = new Map();

    constructor(manager: ChannelManager, def: ChannelDefinition) {
        this._manager = manager;
        this._idString = def.idString;
        this._displayName = def.displayName;
        this._kindOfKey = def.kindOfKey;

        this.notifyContentDataArraysChange = this.notifyContentDataArraysChange.bind(this);
    }

    getIdString(): string {
        return this._idString;
    }

    getDisplayName(): string {
        return this._displayName;
    }

    getManager(): ChannelManager {
        return this._manager;
    }

    getKindOfKey(): KeyKind {
        return this._kindOfKey;
    }

    numberOfReceivers(): number {
        return this._receivers.length;
    }

    getContents(): ChannelContent[] {
        return this._contents;
    }

    connectReceiver(receiver: Receiver): void {
        this._receivers.push(receiver);
        this.notifySubscribers(ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED);
    }

    disconnectReceiver(receiver: Receiver): void {
        this._receivers = this._receivers.filter((recv) => recv !== receiver);
        this.notifySubscribers(ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED);
    }

    closeChannel() {
        this.notifyChannelAboutToBeRemoved();
    }

    private notifyChannelContentsArrayChange(): void {
        this._receivers.forEach((recv) => recv.onContentsArrayChange());
    }

    private notifyContentDataArraysChange(): void {
        this._receivers.forEach((recv) => recv.onContentDataArrayChange());
    }

    private notifyChannelAboutToBeRemoved(): void {
        this._receivers.forEach((recv) => recv.onChannelAboutToBeRemoved());
    }

    replaceContents(contentDefinitions: ChannelContentDefinition[]): void {
        this._contents = [];

        for (const contentDefinition of contentDefinitions) {
            const content = new ChannelContent({ ...contentDefinition });
            this._contents.push(content);
        }

        this.notifyChannelContentsArrayChange();
        this.notifyContentDataArraysChange();
    }

    subscribe(topic: ChannelNotificationTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    unsubscribe(topic: ChannelNotificationTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        topicSubscribers.delete(callback);
    }

    private notifySubscribers(topic: ChannelNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}
