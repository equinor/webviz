import { KeyKind } from "@framework/DataChannelTypes";

import { DataGenerator, ModuleChannelContent, ModuleChannelContentNotificationTopic } from "./ModuleChannelContent";
import { ModuleChannelManager } from "./ModuleChannelManager";

export interface ModuleChannelDefinition {
    readonly idString: string;
    readonly displayName: string;
    readonly kindOfKey: KeyKind;
}

export enum ModuleChannelNotificationTopic {
    ContentsArrayChange = "contents-array-change",
    ContentsDataArraysChange = "contents-data-arrays-change",
    ChannelAboutToBeRemoved = "channel-about-to-be-removed",
}

export class ModuleChannel {
    private _idString: string;
    private _displayName: string;
    private _kindOfKey: KeyKind;
    private _manager: ModuleChannelManager;
    private _contents: ModuleChannelContent[] = [];
    private _subscribersMap: Map<ModuleChannelNotificationTopic, Set<() => void>> = new Map();

    constructor({
        manager,
        idString,
        displayName,
        kindOfKey,
    }: {
        manager: ModuleChannelManager;
        idString: string;
        displayName: string;
        kindOfKey: KeyKind;
    }) {
        this._manager = manager;
        this._idString = idString;
        this._displayName = displayName;
        this._kindOfKey = kindOfKey;

        this.handleContentDataArraysChange = this.handleContentDataArraysChange.bind(this);
    }

    getIdString(): string {
        return this._idString;
    }

    getDisplayName(): string {
        return this._displayName;
    }

    getManager(): ModuleChannelManager {
        return this._manager;
    }

    getKindOfKey(): KeyKind {
        return this._kindOfKey;
    }

    getContent(idString: string): ModuleChannelContent | null {
        const content = this._contents.find((content) => content.getIdString() === idString);
        if (!content) {
            return null;
        }

        return content;
    }

    getContents(): ModuleChannelContent[] {
        return this._contents;
    }

    private handleContentDataArraysChange(): void {
        this.notifySubscribers(ModuleChannelNotificationTopic.ContentsDataArraysChange);
    }

    replaceContents(
        contentDefinitions: {
            idString: string;
            displayName: string;
            dataGenerator: DataGenerator;
        }[]
    ): void {
        this._contents = [];

        for (const contentDefinition of contentDefinitions) {
            const content = new ModuleChannelContent({ ...contentDefinition });
            content.subscribe(
                ModuleChannelContentNotificationTopic.DataArrayChange,
                this.handleContentDataArraysChange
            );
            this._contents.push(content);
        }

        this.notifySubscribers(ModuleChannelNotificationTopic.ContentsArrayChange);
        this.notifySubscribers(ModuleChannelNotificationTopic.ContentsDataArraysChange);
    }

    subscribe(topic: ModuleChannelNotificationTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    unsubscribe(topic: ModuleChannelNotificationTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        topicSubscribers.delete(callback);
    }

    private notifySubscribers(topic: ModuleChannelNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }

    beforeRemove(): void {
        this.notifySubscribers(ModuleChannelNotificationTopic.ChannelAboutToBeRemoved);
    }
}
