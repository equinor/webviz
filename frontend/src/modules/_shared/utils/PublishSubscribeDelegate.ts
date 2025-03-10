import React from "react";

export type TopicPayloads = Record<string, any>;

export interface PublishSubscribe<TTopicPayloads extends TopicPayloads> {
    makeSnapshotGetter<T extends keyof TTopicPayloads>(topic: T): () => TTopicPayloads[T];
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<TTopicPayloads>;
}

export class PublishSubscribeDelegate<TTopicPayloads extends TopicPayloads> {
    private _subscribers = new Map<keyof TTopicPayloads, Set<() => void>>();

    notifySubscribers(topic: keyof TTopicPayloads): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    makeSubscriberFunction(topic: keyof TTopicPayloads): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const subscribers = this._subscribers.get(topic) || new Set();
            subscribers.add(onStoreChangeCallback);
            this._subscribers.set(topic, subscribers);

            return () => {
                subscribers.delete(onStoreChangeCallback);
            };
        };

        return subscriber;
    }
}

export function usePublishSubscribeTopicValue<
    TTopicPayloads extends TopicPayloads,
    TTopic extends keyof TTopicPayloads
>(publishSubscribe: PublishSubscribe<TTopicPayloads>, topic: TTopic): TTopicPayloads[TTopic] {
    const value = React.useSyncExternalStore<TTopicPayloads[TTopic]>(
        publishSubscribe.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        publishSubscribe.makeSnapshotGetter(topic)
    );

    return value;
}
