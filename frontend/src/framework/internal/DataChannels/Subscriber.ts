import { Channel, ChannelTopic } from "./Channel";
import { PublishSubscribeBroker } from "./PublishSubscribeBroker";

import { Genre } from "../../DataChannelTypes";

export interface SubscriberDefinition {
    ident: string;
    name: string;
    supportedGenres: Genre[];
    supportsMultiContents?: boolean;
}

export enum SubscriberTopic {
    ContentChange = "content-change",
    ChannelChange = "channel-change",
}

export class Subscriber {
    private _broker: PublishSubscribeBroker;
    private _ident: string;
    private _name: string;
    private _supportedGenres: Genre[];
    private _supportsMultiContents: boolean;
    private _channel: Channel<any, any, any> | null = null;
    private _contentIdents: string[] = [];
    private _subscribersMap: Map<SubscriberTopic, Set<() => void>> = new Map();
    private _subscribedToAllContents: boolean = false;

    constructor(options: {
        broker: PublishSubscribeBroker;
        ident: string;
        name: string;
        supportedGenres: Genre[];
        supportsMultiContents?: boolean;
    }) {
        this._broker = options.broker;
        this._ident = options.ident;
        this._name = options.name;
        this._supportedGenres = options.supportedGenres;
        this._supportsMultiContents = options.supportsMultiContents ?? false;
        this.handleChannelRemove = this.handleChannelRemove.bind(this);
        this.handleContentChange = this.handleContentChange.bind(this);
        this.handleContentsChange = this.handleContentsChange.bind(this);
    }

    getBroker(): PublishSubscribeBroker {
        return this._broker;
    }

    subscribeToChannel(channel: Channel<any, any, any>, contentIdents: string[] | "All"): void {
        if (this.hasActiveSubscription()) {
            this.unsubscribeFromCurrentChannel();
        }

        this._channel = channel;
        if (contentIdents === "All") {
            if (this._supportsMultiContents) {
                this._contentIdents = channel.getContents().map((p) => p.getIdent());
            } else {
                const firstProgram = channel.getContents().at(0);
                if (firstProgram) {
                    this._contentIdents = [firstProgram.getIdent()];
                } else {
                    this._contentIdents = [];
                }
            }
            this._subscribedToAllContents = true;
            this._channel.subscribe(ChannelTopic.ContentsChange, this.handleContentsChange);
        } else {
            this._contentIdents = contentIdents;
            this._subscribedToAllContents = false;
            this._channel.unsubscribe(ChannelTopic.ContentsChange, this.handleContentsChange);
        }

        this._channel.subscribe(ChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel.subscribe(ChannelTopic.DataChange, this.handleContentChange);
        this._channel.subscribe(ChannelTopic.ContentsChange, this.handleContentChange);

        this.notifySubscribers(SubscriberTopic.ChannelChange);
        this.notifySubscribers(SubscriberTopic.ContentChange);
    }

    getChannel(): Channel<any, any, any> | null {
        return this._channel;
    }

    getHasMultiContentSupport(): boolean {
        return this._supportsMultiContents;
    }

    getHasSubscribedToAllContents(): boolean {
        return this._subscribedToAllContents;
    }

    getContentIdents(): string[] {
        return this._contentIdents;
    }

    unsubscribeFromCurrentChannel(): void {
        if (this._channel) {
            this._channel.unsubscribe(ChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
            this._channel.unsubscribe(ChannelTopic.DataChange, this.handleContentChange);
            this._channel.unsubscribe(ChannelTopic.ContentsChange, this.handleContentsChange);
            this._channel = null;
            this._contentIdents = [];
        }
    }

    hasActiveSubscription(): boolean {
        return this._channel !== null;
    }

    getIdent(): string {
        return this._ident;
    }

    getName(): string {
        return this._name;
    }

    getSupportedGenres(): Genre[] {
        return this._supportedGenres;
    }

    subscribe(topic: SubscriberTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: SubscriberTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }

    private handleChannelRemove(): void {
        this._channel?.unsubscribe(ChannelTopic.ChannelAboutToBeRemoved, this.handleChannelRemove);
        this._channel?.unsubscribe(ChannelTopic.DataChange, this.handleContentChange);
        this._channel?.unsubscribe(ChannelTopic.ContentsChange, this.handleContentsChange);
        this._channel = null;
        this._contentIdents = [];
    }

    private handleContentChange(): void {
        this.notifySubscribers(SubscriberTopic.ContentChange);
    }

    private handleContentsChange(): void {
        if (this._supportsMultiContents) {
            this._contentIdents = this._channel?.getContents().map((p) => p.getIdent()) ?? [];
        } else {
            const firstContent = this._channel?.getContents().at(0);
            if (firstContent) {
                this._contentIdents = [firstContent.getIdent()];
            } else {
                this._contentIdents = [];
            }
        }
    }
}
