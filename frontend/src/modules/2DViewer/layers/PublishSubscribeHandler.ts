import React from "react";

export type TopicPayloads<TTopic extends string> = Record<TTopic, any>;

export interface PublishSubscribe<TTopic extends string, TTopicPayloads extends TopicPayloads<TTopic>> {
    makeSnapshotGetter<T extends TTopic>(topic: T): () => TTopicPayloads[T];
    getPublishSubscribeHandler(): PublishSubscribeHandler<TTopic>;
}

export class PublishSubscribeHandler<TTopic extends string> {
    private _subscribers = new Map<TTopic, Set<() => void>>();

    subscribe(topic: TTopic, subscriber: () => void): void {
        const subscribers = this._subscribers.get(topic) ?? new Set();
        subscribers.add(subscriber);
        this._subscribers.set(topic, subscribers);
    }

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
        publishSubscribe.getPublishSubscribeHandler().makeSubscriberFunction(topic),
        publishSubscribe.makeSnapshotGetter(topic)
    );

    return value;
}
