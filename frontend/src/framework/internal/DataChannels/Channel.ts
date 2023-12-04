import { Content, ContentTopic } from "./Content";
import { PublishSubscribeBroker } from "./PublishSubscribeBroker";

import { Data, Genre, Type, TypeToTSTypeMapping } from "../../DataChannelTypes";

export interface ChannelDefinition {
    readonly ident: string;
    readonly name: string;
    readonly genre: Genre;
    readonly dataType: Type;
    readonly metaData?: Record<string, Type>;
}

export enum ChannelTopic {
    ContentsChange = "contents-change",
    DataChange = "data-change",
    ChannelAboutToBeRemoved = "channel-about-to-be-removed",
}

export class Channel {
    /**
     * This class holds all programs of a module.
     */

    private contents: Content[] = [];
    private _subscribersMap: Map<ChannelTopic, Set<() => void>> = new Map();

    constructor(
        private _broadcaster: PublishSubscribeBroker,
        private _ident: string,
        private _name: string,
        private _genre: Genre,
        private _dataType: Type,
        private _metaData?: Record<string, TypeToTSTypeMapping[Type]>
    ) {
        this.handleContentDataChange = this.handleContentDataChange.bind(this);
    }

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    getBroadcaster(): PublishSubscribeBroker {
        return this._broadcaster;
    }

    getGenre(): Genre {
        return this._genre;
    }

    getDataType(): Type {
        return this._dataType;
    }

    getMetaData(): Record<string, TypeToTSTypeMapping[Type]> | null {
        return this._metaData ?? null;
    }

    getContent(name: string): Content | null {
        const content = this.contents.find((p) => p.getName() === name);
        if (!content) {
            return null;
        }

        return content;
    }

    getContents(): Content[] {
        return this.contents;
    }

    private handleContentDataChange(): void {
        this.notifySubscribers(ChannelTopic.DataChange);
    }

    registerContent(
        ident: string,
        name: string,
        dataGenerator: () => { data: Data<Type, Type>[]; metaData?: Record<string, TypeToTSTypeMapping[Type]> }
    ): void {
        const content = new Content(ident, name, dataGenerator);
        content.subscribe(ContentTopic.ContentChange, this.handleContentDataChange);
        this.contents.push(content);
        this.notifySubscribers(ChannelTopic.ContentsChange);
        this.notifySubscribers(ChannelTopic.DataChange);
    }

    unregisterContent(ident: string): void {
        this.contents = this.contents.filter((p) => p.getIdent() !== ident);
        this.notifySubscribers(ChannelTopic.ContentsChange);
    }

    unregisterAllContents(): void {
        this.contents = [];
        this.notifySubscribers(ChannelTopic.ContentsChange);
    }

    hasContent(ident: string): boolean {
        return this.contents.some((p) => p.getIdent() === ident);
    }

    subscribe(topic: ChannelTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);
    }

    unsubscribe(topic: ChannelTopic, callback: () => void): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        topicSubscribers.delete(callback);
    }

    private notifySubscribers(topic: ChannelTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }

    beforeRemove(): void {
        this.notifySubscribers(ChannelTopic.ChannelAboutToBeRemoved);
    }
}
