import { Channel, ChannelDefinition } from "./Channel";
import { ChannelReceiver, ChannelReceiverDefinition } from "./ChannelReceiver";

export enum ChannelManagerNotificationTopic {
    CHANNELS_CHANGE = "channels-change",
    RECEIVERS_CHANGE = "receivers-change",
}

export class ChannelManager {
    private readonly _moduleInstanceId: string;
    private _channels: Channel[] = [];
    private _receivers: ChannelReceiver[] = [];
    private _subscribersMap: Map<ChannelManagerNotificationTopic, Set<() => void>> = new Map();

    constructor(readonly moduleInstanceId: string) {
        this._moduleInstanceId = moduleInstanceId;
    }

    getChannel(idString: string): Channel | null {
        return this._channels.find((channel) => channel.getIdString() === idString) ?? null;
    }

    getChannels(): readonly Channel[] {
        return this._channels;
    }

    getReceiver(idString: string): ChannelReceiver | null {
        return this._receivers.find((receiver) => receiver.getIdString() === idString) ?? null;
    }

    getReceivers(): readonly ChannelReceiver[] {
        return this._receivers;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannels(channelDefinitions: ChannelDefinition[]): void {
        for (const channelDefinition of channelDefinitions) {
            const newChannel = new Channel(this, channelDefinition);
            this._channels.push(newChannel);
        }

        this.notifySubscribers(ChannelManagerNotificationTopic.CHANNELS_CHANGE);
    }

    registerReceivers(receiverDefinitions: ChannelReceiverDefinition[]): void {
        for (const receiverDefinition of receiverDefinitions) {
            const receiver = new ChannelReceiver(this, receiverDefinition);
            this._receivers.push(receiver);
        }

        this.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
    }

    unregisterAllChannels(): void {
        for (const channel of this._channels) {
            channel.notifySubscribersOfChannelAboutToBeRemoved();
        }
        this._channels = [];

        this.notifySubscribers(ChannelManagerNotificationTopic.CHANNELS_CHANGE);
    }

    unregisterAllReceivers(): void {
        for (const receiver of this._receivers) {
            receiver.unsubscribeFromCurrentChannel();
        }
        this._receivers = [];

        this.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
    }

    subscribe(topic: ChannelManagerNotificationTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: ChannelManagerNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}
