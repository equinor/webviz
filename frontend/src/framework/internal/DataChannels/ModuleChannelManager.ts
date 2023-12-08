import { KeyKind } from "@framework/DataChannelTypes";

import { ModuleChannel } from "./ModuleChannel";
import { ModuleChannelReceiver } from "./ModuleChannelReceiver";

export enum ModuleChannelManagerNotificationTopic {
    ChannelsChange = "channels-change",
    ReceiversChange = "receivers-change",
}

export class ModuleChannelManager {
    private _moduleInstanceId: string;
    private _channels: ModuleChannel[] = [];
    private _receivers: ModuleChannelReceiver[] = [];
    private _subscribersMap: Map<ModuleChannelManagerNotificationTopic, Set<() => void>> = new Map();

    constructor(moduleInstanceId: string) {
        this._moduleInstanceId = moduleInstanceId;
    }

    getChannel(idString: string): ModuleChannel | null {
        return this._channels.find((channel) => channel.getIdString() === idString) ?? null;
    }

    getChannels(): ModuleChannel[] {
        return this._channels;
    }

    getReceiver(idString: string): ModuleChannelReceiver | null {
        return this._receivers.find((receiver) => receiver.getIdString() === idString) ?? null;
    }

    getReceivers(): ModuleChannelReceiver[] {
        return this._receivers;
    }

    getModuleInstanceId(): string {
        return this._moduleInstanceId;
    }

    registerChannel({
        idString,
        displayName,
        kindOfKey,
    }: {
        readonly idString: string;
        readonly displayName: string;
        readonly kindOfKey: KeyKind;
    }): void {
        const newChannel = new ModuleChannel({
            manager: this,
            idString,
            displayName,
            kindOfKey,
        });
        this._channels.push(newChannel);

        this.notifySubscribers(ModuleChannelManagerNotificationTopic.ChannelsChange);
    }

    registerReceiver({
        idString,
        displayName,
        supportedKindsOfKeys,
        supportsMultiContents,
    }: {
        idString: string;
        displayName: string;
        supportedKindsOfKeys: readonly KeyKind[];
        supportsMultiContents: boolean;
    }): void {
        const receiver = new ModuleChannelReceiver({
            manager: this,
            idString: idString,
            displayName: displayName,
            supportedKindsOfKeys: supportedKindsOfKeys,
            supportsMultiContents: supportsMultiContents,
        });
        this._receivers.push(receiver);

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
