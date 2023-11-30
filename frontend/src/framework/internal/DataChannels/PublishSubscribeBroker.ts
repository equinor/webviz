import { Channel, ChannelDefinitions } from "./Channel";
import { Subscriber, SubscriberDefinitions } from "./Subscriber";

import { Genre } from "../../DataChannelTypes";

export enum BroadcastServiceTopic {
    ChannelsChange = "channels-change",
    ListenersChange = "listeners-change",
}

export class PublishSubscribeBroker<
    TChannelDefs extends ChannelDefinitions | never,
    TSubscriberDefs extends SubscriberDefinitions | never
> {
    /**
     * This class holds all channels and subscribers of a module instance.
     * NOTE: Should subscribers and channels be separated into different classes?
     */

    private _channels: Channel<any, any, any>[] = [];
    private _subscribers: Subscriber<any>[] = [];
    private _subscribersMap: Map<BroadcastServiceTopic, Set<() => void>> = new Map();

    // Is constructor assignment a pattern we would like to use?
    constructor(private _moduleInstanceId: string) {}

    getChannel<T extends Extract<keyof TChannelDefs, string>>(
        ident: T
    ): Channel<TChannelDefs[T]["genre"], TChannelDefs[T]["dataType"], TChannelDefs[T]["metaData"]> | null {
        return this._channels.find((c) => c.getIdent() === ident) ?? null;
    }

    getChannels(): Channel<any, any, any>[] {
        return this._channels;
    }

    getSubscriber<T extends Extract<keyof TSubscriberDefs, string>>(
        ident: T
    ): Subscriber<TSubscriberDefs[T]["supportedGenres"]> | null {
        return this._subscribers.find((l) => l.getIdent() === ident) ?? null;
    }

    getSubscribers(): Subscriber<any>[] {
        return this._subscribers;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannel<T extends Extract<keyof TChannelDefs, string>>(options: {
        ident: T;
        name: string;
        genre: TChannelDefs[T]["genre"];
        dataType: TChannelDefs[T]["dataType"];
        metaData?: TChannelDefs[T]["metaData"];
    }): void {
        const newChannel = new Channel(
            this,
            options.ident,
            options.name,
            options.genre,
            options.dataType,
            options.metaData
        );
        this._channels.push(newChannel);
        this.notifySubscribers(BroadcastServiceTopic.ChannelsChange);
    }

    registerSubscriber(options: {
        ident: string;
        name: string;
        supportedGenres: readonly Genre[];
        supportsMultiContents: boolean;
    }): void {
        const newListener = new Subscriber({
            broker: this,
            ident: options.ident,
            name: options.name,
            supportedGenres: options.supportedGenres,
            supportsMultiContents: options.supportsMultiContents,
        });
        this._subscribers.push(newListener);
        this.notifySubscribers(BroadcastServiceTopic.ListenersChange);
    }

    unregisterAllChannels(): void {
        for (const channel of this._channels) {
            channel.beforeRemove();
        }
        this._channels = [];
        this.notifySubscribers(BroadcastServiceTopic.ChannelsChange);
    }

    unregisterAllSubscribers(): void {
        for (const listener of this._subscribers) {
            listener.unsubscribeFromCurrentChannel();
        }
        this._subscribers = [];
        this.notifySubscribers(BroadcastServiceTopic.ListenersChange);
    }

    subscribe(topic: BroadcastServiceTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: BroadcastServiceTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}
