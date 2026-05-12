import type { ModuleInstance } from "@framework/ModuleInstance";
import type { PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";
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
    CONNECTION_STATE_REVISION = "connection_state_revision",
}

export type ChannelManagerNotificationTopicPayload = {
    [ChannelManagerNotificationTopic.CHANNELS_CHANGE]: readonly Channel[];
    [ChannelManagerNotificationTopic.RECEIVERS_CHANGE]: readonly ChannelReceiver[];
    [ChannelManagerNotificationTopic.CONNECTION_STATE_REVISION]: number;
};

export class ChannelManager implements PublishSubscribe<ChannelManagerNotificationTopicPayload> {
    private _unsubscribeFunctionsManagerDelegate = new UnsubscribeFunctionsManagerDelegate();

    private readonly _moduleInstanceId: string;
    private _channels: Channel[] = [];
    private _receivers: ChannelReceiver[] = [];
    private _connectionStateRevision = 0;

    private _pubSubDelegate = new PublishSubscribeDelegate<ChannelManagerNotificationTopicPayload>();

    constructor(readonly moduleInstanceId: string) {
        this._moduleInstanceId = moduleInstanceId;

        this.notifyConnectionStateChange = this.notifyConnectionStateChange.bind(this);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<ChannelManagerNotificationTopicPayload> {
        return this._pubSubDelegate;
    }

    makeSnapshotGetter<T extends ChannelManagerNotificationTopic>(
        topic: T,
    ): () => ChannelManagerNotificationTopicPayload[T] {
        switch (topic) {
            case ChannelManagerNotificationTopic.CHANNELS_CHANGE:
                return () => this.getChannels() as any;
            case ChannelManagerNotificationTopic.RECEIVERS_CHANGE:
                return () => this.getReceivers() as any;
            case ChannelManagerNotificationTopic.CONNECTION_STATE_REVISION:
                return () => this._connectionStateRevision as any;

            default:
                throw new Error(`Unsupported topic: ${topic}`);
        }
    }

    getChannel(idString: string): Channel | null {
        return this._channels.find((channel) => channel.getIdString() === idString) ?? null;
    }

    private setChannels(newChannels: Channel[]) {
        this._channels = newChannels;

        this._pubSubDelegate.notifySubscribers(ChannelManagerNotificationTopic.CHANNELS_CHANGE);
        this.notifyConnectionStateChange();
    }

    getChannels(): readonly Channel[] {
        return this._channels;
    }

    getReceiver(idString: string): ChannelReceiver | null {
        return this._receivers.find((receiver) => receiver.getIdString() === idString) ?? null;
    }

    private setReceivers(newReceivers: ChannelReceiver[]) {
        this._receivers = newReceivers;

        this._pubSubDelegate.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
        this.notifyConnectionStateChange();
    }

    getReceivers(): readonly ChannelReceiver[] {
        return this._receivers;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    getNumberOfOutgoingConnections(): number {
        return this._channels.reduce((acc, channel) => acc + channel.getNumberOfReceivers(), 0);
    }

    getNumberOfIncomingConnections(): number {
        return this._receivers.filter((receiver) => receiver.hasActiveSubscription()).length;
    }

    registerChannels(channelDefinitions: ChannelDefinition[]): void {
        if (!channelDefinitions.length) return;

        const newChannels = [...this._channels];

        for (const channelDefinition of channelDefinitions) {
            const channel = new Channel(this, channelDefinition);
            newChannels.push(channel);

            channel.subscribe(ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED, this.notifyConnectionStateChange);
        }

        this.setChannels(newChannels);
    }

    registerReceivers(receiverDefinitions: ChannelReceiverDefinition[]): void {
        if (!receiverDefinitions.length) return;

        const newReceivers = [...this._receivers];

        for (const receiverDefinition of receiverDefinitions) {
            const receiver = new ChannelReceiver(this, receiverDefinition);
            newReceivers.push(receiver);

            this._unsubscribeFunctionsManagerDelegate.registerUnsubscribeFunction(
                receiver.getIdString(),
                receiver.subscribe(ChannelReceiverNotificationTopic.CHANNEL_CHANGE, this.notifyConnectionStateChange),
            );
        }

        this.setReceivers(newReceivers);
    }

    unregisterAllChannels(): void {
        for (const channel of this._channels) {
            channel.closeChannel();
        }

        this.setChannels([]);
    }

    unregisterAllReceivers(): void {
        for (const receiver of this._receivers) {
            receiver.disconnectFromCurrentChannel();
        }

        this._unsubscribeFunctionsManagerDelegate.unsubscribeAll();
        this.setReceivers([]);
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

        this._pubSubDelegate.notifySubscribers(ChannelManagerNotificationTopic.RECEIVERS_CHANGE);
    }

    private notifyConnectionStateChange(): void {
        this._connectionStateRevision++;
        this._pubSubDelegate.notifySubscribers(ChannelManagerNotificationTopic.CONNECTION_STATE_REVISION);
    }
}
