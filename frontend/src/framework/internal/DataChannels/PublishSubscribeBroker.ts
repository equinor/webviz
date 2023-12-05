import { Channel } from "./Channel";
import { Subscriber } from "./Subscriber";

import { Data, KeyKind, Type, TypeToTypeScriptTypeMapping } from "../../DataChannelTypes";

export enum BroadcastServiceTopic {
    ChannelsChange = "channels-change",
    ListenersChange = "listeners-change",
}

export class PublishSubscribeBroker {
    /**
     * This class holds all channels and subscribers of a module instance.
     * NOTE: Should subscribers and channels be separated into different classes?
     */

    private _channels: Channel[] = [];
    private _subscribers: Subscriber[] = [];
    private _subscribersMap: Map<BroadcastServiceTopic, Set<() => void>> = new Map();

    // Is constructor assignment a pattern we would like to use?
    constructor(private _moduleInstanceId: string) {}

    getChannel(ident: string): Channel | null {
        return this._channels.find((c) => c.getIdent() === ident) ?? null;
    }

    getChannels(): Channel[] {
        return this._channels;
    }

    getSubscriber(ident: string): Subscriber | null {
        return this._subscribers.find((l) => l.getIdent() === ident) ?? null;
    }

    getSubscribers(): Subscriber[] {
        return this._subscribers;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannel(options: {
        readonly ident: string;
        readonly name: string;
        readonly genre: KeyKind;
        readonly dataType: Type;
        readonly metaData?: Record<string, TypeToTypeScriptTypeMapping[Type]>;
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
        supportedGenres: readonly KeyKind[];
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
