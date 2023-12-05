import { Channel, ChannelTopic } from "./Channel";
import { PublishSubscribeBroker } from "./PublishSubscribeBroker";

import { KeyKind } from "../../DataChannelTypes";

export interface SubscriberDefinition {
    readonly ident: string;
    readonly name: string;
    readonly supportedGenres: readonly KeyKind[];
    readonly supportsMultiContents?: boolean;
}

export enum SubscriberTopic {
    ContentChange = "content-change",
    ChannelChange = "channel-change",
}

export class Subscriber {
    private readonly _broker: PublishSubscribeBroker;
    private readonly _ident: string;
    private readonly _name: string;
    private readonly _supportedGenres: readonly KeyKind[];
    private readonly _supportsMultiContents: boolean;
    private _channel: Channel | null = null;
    private _contentIdents: string[] = [];
    private _subscribersMap: Map<SubscriberTopic, Set<() => void>> = new Map();
    private _subscribedToAllContents: boolean = false;

    constructor(options: {
        broker: PublishSubscribeBroker;
        ident: string;
        name: string;
        supportedGenres: readonly KeyKind[];
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

    subscribeToChannel(channel: Channel, contentIdents: string[] | "All"): void {
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

    getChannel(): Channel | null {
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

    getSupportedGenres(): readonly KeyKind[] {
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
