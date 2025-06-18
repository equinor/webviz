/**
 * Utilities for using the Publish/Subscribe pattern in React.
 */

import React from "react";

/**
 * A map of each payload that agents can send and receive for each topic
 */
export type TopicPayloads = Record<string, any>;

/**
 * Base pubsub interface
 */
export interface PublishSubscribe<TTopicPayloads extends TopicPayloads> {
    /**
     * Creates a function that fetches the most recent topic value. Note: make sure object payloads are reference stable when unchanged, to avoid unnecessary re-renders
     * @param topic Event topic
     */
    makeSnapshotGetter<T extends keyof TTopicPayloads>(topic: T): () => TTopicPayloads[T];
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<TTopicPayloads>;
}

/**
 * PubSub subscriber manager. Can be used by PublishSubscribe implementers to manage registration and notification of subscribers
 */
export class PublishSubscribeDelegate<TTopicPayloads extends TopicPayloads> {
    private _subscribers = new Map<keyof TTopicPayloads, Set<() => void>>();

    /**
     * Runs the topic callback for each subscriber
     * @param topic The topic to notify to
     */
    notifySubscribers(topic: keyof TTopicPayloads): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    /**
     * Registers a topic subscriber, returning an unsubscribe function
     * @param topic The topic to subscribe to
     * @returns An unsubscribe function
     */
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

/**
 * Hook to set up a standard `React.useSyncExternalStore` pattern for a given topic.
 * @param publishSubscribe A PublishSubscribe instance.
 * @param topic The topic to subscribe to
 * @returns The current value of the topic.
 */
export function usePublishSubscribeTopicValue<
    TTopicPayloads extends TopicPayloads,
    TTopic extends keyof TTopicPayloads,
>(publishSubscribe: PublishSubscribe<TTopicPayloads>, topic: TTopic): TTopicPayloads[TTopic] {
    const value = React.useSyncExternalStore<TTopicPayloads[TTopic]>(
        publishSubscribe.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        publishSubscribe.makeSnapshotGetter(topic),
    );

    return value;
}
