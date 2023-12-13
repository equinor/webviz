import { KeyKind } from "@framework/DataChannelTypes";

import { ModuleChannel } from "./ModuleChannel";
import { ModuleChannelReceiver } from "./ModuleChannelReceiver";

export enum ModuleChannelManagerNotificationTopic {
    ChannelsChange = "channels-change",
    ReceiversChange = "receivers-change",
}

export class ModuleChannelManager {
    private readonly _moduleInstanceId: string;
    private _channels: ModuleChannel[] = [];
    private _receivers: ModuleChannelReceiver[] = [];
    private _subscribersMap: Map<ModuleChannelManagerNotificationTopic, Set<() => void>> = new Map();

    constructor(readonly moduleInstanceId: string) {
        this._moduleInstanceId = moduleInstanceId;
    }

    getChannel(idString: string): ModuleChannel | null {
        return this._channels.find((channel) => channel.getIdString() === idString) ?? null;
    }

    getChannels(): readonly ModuleChannel[] {
        return this._channels;
    }

    getReceiver(idString: string): ModuleChannelReceiver | null {
        return this._receivers.find((receiver) => receiver.getIdString() === idString) ?? null;
    }

    getReceivers(): readonly ModuleChannelReceiver[] {
        return this._receivers;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannels(
        channelDefinitions: {
            readonly idString: string;
            readonly displayName: string;
            readonly kindOfKey: KeyKind;
        }[]
    ): void {
        for (const channelDefinition of channelDefinitions) {
            const newChannel = new ModuleChannel({
                manager: this,
                ...channelDefinition,
            });
            this._channels.push(newChannel);
        }

        this.notifySubscribers(ModuleChannelManagerNotificationTopic.ChannelsChange);
    }

    registerReceivers(
        receiverDefinitions: {
            readonly idString: string;
            readonly displayName: string;
            readonly supportedKindsOfKeys: readonly KeyKind[];
            readonly supportsMultiContents: boolean;
        }[]
    ): void {
        for (const receiverDefinition of receiverDefinitions) {
            const receiver = new ModuleChannelReceiver({
                manager: this,
                idString: receiverDefinition.idString,
                displayName: receiverDefinition.displayName,
                supportedKindsOfKeys: receiverDefinition.supportedKindsOfKeys,
                supportsMultiContents: receiverDefinition.supportsMultiContents,
            });
            this._receivers.push(receiver);
        }

        this.notifySubscribers(ModuleChannelManagerNotificationTopic.ReceiversChange);
    }

    unregisterAllChannels(): void {
        for (const channel of this._channels) {
            channel.beforeRemove();
        }
        this._channels = [];

        this.notifySubscribers(ModuleChannelManagerNotificationTopic.ChannelsChange);
    }

    unregisterAllReceivers(): void {
        for (const receiver of this._receivers) {
            receiver.unsubscribeFromCurrentChannel();
        }
        this._receivers = [];

        this.notifySubscribers(ModuleChannelManagerNotificationTopic.ReceiversChange);
    }

    subscribe(topic: ModuleChannelManagerNotificationTopic, callback: () => void): () => void {
        const topicSubscribers = this._subscribersMap.get(topic) || new Set();

        topicSubscribers.add(callback);

        this._subscribersMap.set(topic, topicSubscribers);

        return () => {
            topicSubscribers.delete(callback);
        };
    }

    private notifySubscribers(topic: ModuleChannelManagerNotificationTopic): void {
        const topicSubscribers = this._subscribersMap.get(topic);

        if (!topicSubscribers) {
            return;
        }

        for (const subscriber of topicSubscribers) {
            subscriber();
        }
    }
}
