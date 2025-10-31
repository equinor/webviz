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
    private _hasValue = new Map<keyof TTopicPayloads, boolean>();

    /**
     * Notify subscribers with a payload
     */
    notifySubscribers<T extends keyof TTopicPayloads>(
        topic: T,
        ...args: TTopicPayloads[T] extends void ? [] : [payload: TTopicPayloads[T]]
    ): void {
        const payload = args.length > 0 ? args[0] : undefined;

        // Store latest value (even if undefined for void types)
        this._latestValues.set(topic, payload);
        this._hasValue.set(topic, true);

        // Notify all subscribers
        const subscribers = this._subscribers.get(topic);
        if (!subscribers) return;

        for (const subscriber of subscribers) {
            subscriber(payload);
        }
    }

    /**
     * Subscribe with immediate payload delivery
     */
    subscribe<T extends keyof TTopicPayloads>(topic: T, callback: (payload: TTopicPayloads[T]) => void): () => void {
        // Immediately call with current value if available
        if (this._hasValue.get(topic)) {
            const currentValue = this._latestValues.get(topic);
            (callback as any)(currentValue);
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

    hasValue(topic: keyof TTopicPayloads): boolean {
        return this._hasValue.get(topic) ?? false;
    }
}
