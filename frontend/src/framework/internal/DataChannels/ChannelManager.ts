import type { Dashboard } from "../WorkbenchSession/Dashboard";

import type { ChannelDefinition } from "./Channel";
import { Channel } from "./Channel";
import type { ChannelReceiverDefinition } from "./ChannelReceiver";
import { ChannelReceiver } from "./ChannelReceiver";

export enum ChannelManagerNotificationTopic {
    CHANNELS_CHANGE = "channels-change",
    RECEIVERS_CHANGE = "receivers-change",
}

export type DataChannelReceiverSubscription = {
    idString: string;
    listensToModuleInstanceId: string;
    channelIdString: string;
    contentIdStrings: string[];
};

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

    serialize(): DataChannelReceiverSubscription[] {
        const subscriptions: DataChannelReceiverSubscription[] = [];

        for (const receiver of this._receivers) {
            const channel = receiver.getChannel();
            if (!channel) {
                continue; // Skip receivers that are not associated with a channel
            }

            const subscription: DataChannelReceiverSubscription = {
                idString: receiver.getIdString(),
                listensToModuleInstanceId: channel.getManager().getModuleInstanceId(),
                channelIdString: channel.getIdString(),
                contentIdStrings: receiver.getContentIdStrings(),
            };
            subscriptions.push(subscription);
        }

        return subscriptions;
    }

    deserialize(subscriptions: DataChannelReceiverSubscription[], dashboard: Dashboard): void {
        for (const subscription of subscriptions) {
            const listensToModuleInstance = dashboard.getModuleInstance(subscription.listensToModuleInstanceId);
            if (!listensToModuleInstance) {
                console.warn(
                    `ChannelManager.deserialize: Module instance with ID ${subscription.listensToModuleInstanceId} not found. Skipping subscription.`,
                );
                continue;
            }
            const channel = listensToModuleInstance.getChannelManager().getChannel(subscription.channelIdString);
            if (!channel) {
                console.warn(
                    `ChannelManager.deserialize: Channel with ID ${subscription.channelIdString} not found. Skipping subscription.`,
                );
                continue;
            }
            const receiver = this.getReceiver(subscription.idString);
            if (!receiver) {
                console.warn(
                    `ChannelManager.deserialize: Receiver with ID ${subscription.idString} not found. Skipping subscription.`,
                );
                continue;
            }
            receiver.subscribeToChannel(channel, subscription.contentIdStrings);
        }

        this.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
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
