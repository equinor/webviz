import { KeyKind } from "@framework/DataChannelTypes";

import { ChannelContent, ChannelContentDefinition, ChannelContentNotificationTopic } from "./ChannelContent";
import { ChannelManager } from "./ChannelManager";

export interface ChannelDefinition {
    readonly idString: string;
    readonly displayName: string;
    readonly kindOfKey: KeyKind;
}

export enum ChannelNotificationTopic {
    CONTENTS_ARRAY_CHANGE = "contents-array-change",
    CONTENTS_DATA_ARRAY_CHANGE = "contents-data-arrays-change",
    CHANNEL_ABOUT_TO_BE_REMOVED = "channel-about-to-be-removed",
}

export class Channel {
    private _idString: string;
    private _displayName: string;
    private _kindOfKey: KeyKind;
    private _manager: ChannelManager;
    private _contents: ChannelContent[] = [];
    private _subscribersMap: Map<ChannelNotificationTopic, Set<() => void>> = new Map();

    constructor(manager: ChannelManager, def: ChannelDefinition) {
        this._manager = manager;
        this._idString = def.idString;
        this._displayName = def.displayName;
        this._kindOfKey = def.kindOfKey;

        this.handleContentDataArraysChange = this.handleContentDataArraysChange.bind(this);
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

    getContents(): ChannelContent[] {
        return this._contents;
    }

    private handleContentDataArraysChange(): void {
        this.notifySubscribers(ChannelNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE);
    }

    replaceContents(contentDefinitions: ChannelContentDefinition[]): void {
        this._contents = [];

        for (const contentDefinition of contentDefinitions) {
            const content = new ChannelContent({ ...contentDefinition });
            content.subscribe(ChannelContentNotificationTopic.DATA_ARRAY_CHANGE, this.handleContentDataArraysChange);
            this._contents.push(content);
        }

        this.notifySubscribers(ChannelNotificationTopic.CONTENTS_ARRAY_CHANGE);
        this.notifySubscribers(ChannelNotificationTopic.CONTENTS_DATA_ARRAY_CHANGE);
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

    notifySubscribersOfChannelAboutToBeRemoved(): void {
        this.notifySubscribers(ChannelNotificationTopic.CHANNEL_ABOUT_TO_BE_REMOVED);
    }
}
