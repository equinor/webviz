/**
 * A map of each payload that agents can send and receive for each topic
 */
export type TopicPayloads = Record<string, any>;

/**
 * Base pubsub interface
 */
export interface PublishSubscribe<TTopicPayloads extends TopicPayloads> {
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<TTopicPayloads>;
}

export class PublishSubscribeDelegate<TTopicPayloads extends TopicPayloads> {
    private _subscribers = new Map<keyof TTopicPayloads, Set<(payload: any) => void>>();
    private _latestValues = new Map<keyof TTopicPayloads, any>();

    /**
     * Notify subscribers with a payload
     */
    notifySubscribers<T extends keyof TTopicPayloads>(topic: T, payload: TTopicPayloads[T]): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber(payload));
        }
    }

    /**
     * Subscribe with immediate payload delivery
     */
    subscribe<T extends keyof TTopicPayloads>(topic: T, callback: (payload: TTopicPayloads[T]) => void): () => void {
        // Immediately call with current value if available
        const currentValue = this._latestValues.get(topic);
        if (currentValue !== undefined) {
            callback(currentValue);
        }

        // Add to subscribers
        const subscribers = this._subscribers.get(topic) || new Set();
        subscribers.add(callback);
        this._subscribers.set(topic, subscribers);

        return () => {
            subscribers.delete(callback);
        };
    }

    /**
     * Get the latest value for a topic (useful for snapshot getters)
     */
    getLatestValue<T extends keyof TTopicPayloads>(topic: T): TTopicPayloads[T] | undefined {
        return this._latestValues.get(topic);
    }
}
