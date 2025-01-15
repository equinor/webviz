import React from "react";

export type TopicPayloads<TTopic extends string> = Record<TTopic, any>;

export interface PublishSubscribe<TTopic extends string, TTopicPayloads extends TopicPayloads<TTopic>> {
    makeSnapshotGetter<T extends TTopic>(topic: T): () => TTopicPayloads[T];
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<TTopic>;
}

export class PublishSubscribeDelegate<TTopic extends string> {
    private _subscribers = new Map<TTopic, Set<() => void>>();

    notifySubscribers(topic: TTopic): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    makeSubscriberFunction(topic: TTopic): (onStoreChangeCallback: () => void) => () => void {
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

export function usePublishSubscribeTopicValue<TTopic extends string, TTopicPayloads extends TopicPayloads<TTopic>>(
    publishSubscribe: PublishSubscribe<TTopic, TTopicPayloads>,
    topic: TTopic
): TTopicPayloads[TTopic] {
    const value = React.useSyncExternalStore<TTopicPayloads[TTopic]>(
        publishSubscribe.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        publishSubscribe.makeSnapshotGetter(topic)
    );

    return value;
}
