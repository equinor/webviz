import type { ModuleInstance } from "@framework/ModuleInstance";
import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { ChannelDefinition } from "./Channel";
import { Channel, ChannelNotificationTopic } from "./Channel";
import type {
    SerializedDataChannelManagerState,
    SerializedDataChannelReceiverSubscription,
} from "./ChannelManager.schema";
import type { ChannelReceiverDefinition } from "./ChannelReceiver";
import { ChannelReceiver, ChannelReceiverNotificationTopic } from "./ChannelReceiver";

export enum ChannelManagerNotificationTopic {
    CHANNELS_CHANGE = "channels-change",
    RECEIVERS_CHANGE = "receivers-change",
    CONNECTION_STATE_CHANGE = "connection_state_change",
}

export class ChannelManager {
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private readonly _moduleInstanceId: string;
    private _channels: Channel[] = [];
    private _receivers: ChannelReceiver[] = [];
    private _subscribersMap: Map<ChannelManagerNotificationTopic, Set<() => void>> = new Map();

    constructor(readonly moduleInstanceId: string) {
        this._moduleInstanceId = moduleInstanceId;

        this.notifyConnectionStateChange = this.notifyConnectionStateChange.bind(this);
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

    getNumberOfOutgoingConnections(): number {
        return this._channels.reduce((acc, channel) => acc + channel.numberOfReceivers(), 0);
    }

    getNumberOfIncomingConnections(): number {
        return this._receivers.filter((receiver) => receiver.hasActiveSubscription()).length;
    }

    registerChannels(channelDefinitions: ChannelDefinition[]): void {
        for (const channelDefinition of channelDefinitions) {
            const channel = new Channel(this, channelDefinition);
            this._channels.push(channel);

            channel.subscribe(ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED, this.notifyConnectionStateChange);
        }

        this.notifySubscribers(ChannelManagerNotificationTopic.CHANNELS_CHANGE);
    }

    registerReceivers(receiverDefinitions: ChannelReceiverDefinition[]): void {
        for (const receiverDefinition of receiverDefinitions) {
            const receiver = new ChannelReceiver(this, receiverDefinition);
            this._receivers.push(receiver);

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                receiver.getIdString(),
                receiver.subscribe(ChannelReceiverNotificationTopic.CHANNEL_CHANGE, this.notifyConnectionStateChange),
            );
        }

        this.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
    }

    unregisterAllChannels(): void {
        for (const channel of this._channels) {
            channel.closeChannel();
        }
        this._channels = [];

        this.notifySubscribers(ChannelManagerNotificationTopic.CHANNELS_CHANGE);
    }

    unregisterAllReceivers(): void {
        for (const receiver of this._receivers) {
            receiver.disconnectFromCurrentChannel();
        }
        this._receivers = [];
        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();

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

    serializeState(): SerializedDataChannelManagerState {
        const subscriptions: SerializedDataChannelReceiverSubscription[] = [];

        for (const receiver of this._receivers) {
            const channel = receiver.getChannel();
            if (!channel) {
                continue; // Skip receivers that are not associated with a channel
            }

            const subscription: SerializedDataChannelReceiverSubscription = {
                idString: receiver.getIdString(),
                listensToModuleInstanceId: channel.getManager().getModuleInstanceId(),
                channelIdString: channel.getIdString(),
                contentIdStrings: receiver.getContentIdStrings(),
            };
            subscriptions.push(subscription);
        }

        return {
            subscriptions,
        };
    }

    deserializeState(
        serializedState: SerializedDataChannelManagerState,
        moduleInstances: ModuleInstance<any, any>[],
    ): void {
        for (const subscription of serializedState.subscriptions) {
            const listensToModuleInstance = moduleInstances.find(
                (instance) => instance.getId() === subscription.listensToModuleInstanceId,
            );
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
            receiver.connectToChannel(channel, subscription.contentIdStrings);
        }

        this.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
    }

    private notifyConnectionStateChange(): void {
        this.notifySubscribers(ChannelManagerNotificationTopic.CONNECTION_STATE_CHANGE);
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
