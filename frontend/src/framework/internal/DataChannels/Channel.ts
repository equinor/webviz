import { Content, ContentTopic } from "./Content";
import { PublishSubscribeBroker } from "./PublishSubscribeBroker";

import { Data, DataType, Genre } from "../../DataChannelTypes";

export interface ChannelDefinition {
    ident: string;
    name: string;
    genre: Genre;
    dataType: DataType;
    metaData?: Record<string, DataType>;
}

export enum ChannelTopic {
    ContentsChange = "contents-change",
    DataChange = "data-change",
    ChannelAboutToBeRemoved = "channel-about-to-be-removed",
}

export class Channel<
    TGenre extends Genre,
    TDataType extends DataType,
    TMetaData extends Record<string, DataType> | undefined
> {
    /**
     * This class holds all programs of a module.
     */

    private contents: Content<TMetaData>[] = [];
    private _subscribersMap: Map<ChannelTopic, Set<() => void>> = new Map();

    constructor(
        private _broadcaster: PublishSubscribeBroker,
        private _ident: string,
        private _name: string,
        private _genre: TGenre,
        private _dataType: TDataType,
        private _metaData?: TMetaData
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

    getMetaData(): Record<string, DataType> | undefined {
        return this._metaData;
    }

    getDataType(): DataType {
        return this._dataType;
    }

    getContent(name: string): Content<TMetaData> | null {
        const program = this.contents.find((p) => p.getName() === name);
        if (!program) {
            return null;
        }

        return program;
    }

    getContents(): Content<TMetaData>[] {
        return this.contents;
    }

    private handleContentDataChange(): void {
        this.notifySubscribers(ChannelTopic.DataChange);
    }

    registerContent(
        ident: string,
        name: string,
        dataGenerator: () => TMetaData extends undefined ? Data[] : { data: Data[]; metaData: TMetaData }
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
