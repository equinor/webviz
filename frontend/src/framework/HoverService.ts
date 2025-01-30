import React from "react";

import _ from "lodash";

export type HoverTopicDefinitions = {
    "hover.md": number | null;
    "hover.wellbore": string | null;
    "hover.realization": number | null;
    "hover.timestamp": number | null;
    "hover.zone": string | null;
    "hover.region": string | null;
    "hover.facies": string | null;
};

// Types for a generic PubSub service
// ? Should these be put in global util? And implemented in WorkbenchServices?
type SubscriberCallback<TopicDefinitions, T extends keyof TopicDefinitions> = (value: TopicDefinitions[T]) => void;

type SubscriberOpts<T extends keyof HoverTopicDefinitions> = {
    // ? Should this be allowed to be optional?
    subscriberId?: string;
    callbackFn: SubscriberCallback<HoverTopicDefinitions, T>;
};

interface PublishSubscribeService<TopicDefinitions> {
    subscribe<T extends keyof TopicDefinitions>(
        topic: T,
        callback: SubscriberCallback<TopicDefinitions, T>,
        subscriberId: string
    ): () => void;

    publishTopicValue<T extends keyof TopicDefinitions>(
        topic: T,
        value: TopicDefinitions[T],
        subscriberId: string
    ): void;
}

export type HoverTopicDefinitionType<T extends keyof HoverTopicDefinitions> = HoverTopicDefinitions[T];
export type ThrottledPublishFunc = _.DebouncedFunc<HoverService["publishTopicValue"]>;


// ? Should this rather be "extends WorkbenchServices" ?
export class HoverService implements PublishSubscribeService<HoverTopicDefinitions> {
    // All subscribers
    #topicSubscribersMap: Map<keyof HoverTopicDefinitions, Set<SubscriberOpts<any>>> = new Map();
    #topicValueCache: Map<keyof HoverTopicDefinitions, any> = new Map();

    // Broadcast throttling. Each broadcasted topic needs their own debounce method
    #topicThrottleMap: Map<keyof HoverTopicDefinitions, ThrottledPublishFunc> = new Map();
    #broadcastThrottleMs = 100;

    #getOrCreateTopicThrottleMethod<T extends keyof HoverTopicDefinitions>(topic: T): ThrottledPublishFunc {
        if (!this.#topicThrottleMap.has(topic)) {
            const throttledMethod = _.throttle(this.#doPublishTopicValue, this.#broadcastThrottleMs);

            this.#topicThrottleMap.set(topic, throttledMethod);
        }

        // If-block above gurantees this is non-null
        return this.#topicThrottleMap.get(topic)!;
    }

    #hasValueBeenBroadcast<T extends keyof HoverTopicDefinitions>(topic: T, value: any) {
        return _.isEqual(this.#topicValueCache.get(topic), value);
    }

    // ! Writen as an arrow function to make typing match "publishTopicValue" parans
    #doPublishTopicValue: HoverService["publishTopicValue"] = (topic, value, publisherId) => {
        const subscribers = this.#topicSubscribersMap.get(topic) ?? [];

        for (const { callbackFn, subscriberId } of subscribers) {
            // Dont publish to yourself
            if (publisherId && publisherId !== subscriberId) {
                callbackFn(value);
            }
        }
    };

    subscribe<T extends keyof HoverTopicDefinitions>(
        topic: T,
        callbackFn: SubscriberCallback<HoverTopicDefinitions, T>,
        subscriberId?: string
    ): () => void {
        const newEntry = { subscriberId, callbackFn };

        const subscribersSet = this.#topicSubscribersMap.get(topic) || new Set();
        subscribersSet.add(newEntry);

        this.#topicSubscribersMap.set(topic, subscribersSet);

        // If we already have a value for this topic, trigger the callback immediately
        // May have to revise this and make it an op-in behavior, but for now it's fine
        if (this.#topicValueCache.has(topic)) {
            callbackFn(this.#topicValueCache.get(topic));
        }

        return () => {
            subscribersSet.delete(newEntry);
        };
    }
    publishTopicValue<T extends keyof HoverTopicDefinitions>(
        topic: T,
        value: HoverTopicDefinitions[T],
        publisherId?: string
    ): void {
        if (this.#hasValueBeenBroadcast(topic, value)) return;
        // ? Should we add to cache regardless of the throttle function, or make it part of the throttled method?
        this.#topicValueCache.set(topic, value);

        const throttledBroadcast = this.#getOrCreateTopicThrottleMethod(topic);

        throttledBroadcast(topic, value, publisherId);
    }
}

export function useHoverValue<T extends keyof HoverTopicDefinitions>(
    topic: T,
    moduleId: string,
    hoverService: HoverService
): [HoverTopicDefinitions[T], (v: HoverTopicDefinitions[T]) => void] {
    const [latestValue, setLatestValue] = React.useState<HoverTopicDefinitions[T]>(null);

    // Helper to track if the update if the latest update came from the implementer, or someone else

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: HoverTopicDefinitions[T] | null) {
                setLatestValue(newValue);
            }
            const unsubscribeFunc = hoverService.subscribe(topic, handleNewValue, moduleId);
            return unsubscribeFunc;
        },
        [hoverService, moduleId, topic]
    );

    const updateValue = React.useCallback(
        function updateValue(newVal: HoverTopicDefinitions[T]) {
            setLatestValue(newVal);

            hoverService.publishTopicValue(topic, newVal, moduleId);
        },
        [moduleId, topic, hoverService]
    );

    return [latestValue, updateValue];
}
