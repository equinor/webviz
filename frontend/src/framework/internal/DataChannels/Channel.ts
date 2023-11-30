import { Content, ContentTopic } from "./Content";
import { PublishSubscribeBroker } from "./PublishSubscribeBroker";

import { Data, Genre, GenreType, Type } from "../../DataChannelTypes";

export interface ChannelDefinitions {
    [ident: string]: {
        name: string;
        genre: Genre;
        dataType: Type;
        metaData?: Record<string, Type>;
    };
}

export enum ChannelTopic {
    ContentsChange = "contents-change",
    DataChange = "data-change",
    ChannelAboutToBeRemoved = "channel-about-to-be-removed",
}

export class Channel<TGenre extends Genre, TDataType extends Type, TMetaData extends Record<string, Type> | undefined> {
    /**
     * This class holds all programs of a module.
     */

    private contents: Content<Data<GenreType[TGenre], TDataType>, TMetaData>[] = [];
    private _subscribersMap: Map<ChannelTopic, Set<() => void>> = new Map();

    constructor(
        private _broadcaster: PublishSubscribeBroker<any, any>,
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

    getBroadcaster(): PublishSubscribeBroker<any, any> {
        return this._broadcaster;
    }

    getGenre(): Genre {
        return this._genre;
    }

    getMetaData(): Record<string, Type> | undefined {
        return this._metaData;
    }

    getDataType(): Type {
        return this._dataType;
    }

    getContent(name: string): Content<Data<GenreType[TGenre], TDataType>, TMetaData> | null {
        const content = this.contents.find((p) => p.getName() === name);
        if (!content) {
            return null;
        }

        return content;
    }

    getContents(): Content<Data<GenreType[TGenre], TDataType>, TMetaData>[] {
        return this.contents;
    }

    private handleContentDataChange(): void {
        this.notifySubscribers(ChannelTopic.DataChange);
    }

    registerContent(
        ident: string,
        name: string,
        dataGenerator: () => TMetaData extends undefined
            ? Data<GenreType[TGenre], TDataType>[]
            : { data: Data<GenreType[TGenre], TDataType>[]; metaData: TMetaData }
    ): void {
        const content = new Content<Data<GenreType[TGenre], TDataType>, TMetaData>(ident, name, dataGenerator);
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
