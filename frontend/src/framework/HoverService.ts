import React from "react";

import { throttle } from "lodash";

import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

const HOVER_UPDATE_THROTTLE_MS = 100;

export enum HoverTopic {
    WELLBORE_MD = "hover.md",
    WELLBORE = "hover.wellbore",
    REALIZATION = "hover.realization",
    TIMESTAMP = "hover.timestamp",
    ZONE = "hover.zone",
    REGION = "hover.region",
    FACIES = "hover.facies",
    WORLD_POS = "hover.world_pos",
}

export type HoverData = {
    [HoverTopic.WELLBORE_MD]: { wellboreUuid: string; md: number } | null;
    [HoverTopic.WELLBORE]: string | null;
    [HoverTopic.REALIZATION]: number | null;
    [HoverTopic.TIMESTAMP]: number | null;
    [HoverTopic.ZONE]: string | null;
    [HoverTopic.REGION]: string | null;
    [HoverTopic.FACIES]: string | null;
    [HoverTopic.WORLD_POS]: { x?: number; y?: number; z?: number } | null;
};

type ThrottledPublishFunc = _.DebouncedFunc<<T extends keyof HoverData>(topic: T, newValue: HoverData[T]) => void>;

/**
 * Service to manage hover data across the application. Contains two different data sets, one that is updated immediately, and one that is updated at a throttled interval.
 */
export class HoverService {
    // Currently available hover-data. The two objects are updated at different rates,
    // but will contain the same data when the system is not actively hovering
    private _hoverData: Partial<HoverData> = {};
    private _throttledHoverData: Partial<HoverData> = {};
    private _lastHoveredModule: string | null = null;

    // Throttling. Each topic is updated with its own throttle method.
    private _topicThrottleMap = new Map<keyof HoverData, ThrottledPublishFunc>();
    private _dataUpdateThrottleMs = HOVER_UPDATE_THROTTLE_MS;

    // Delegate to handle update notifications
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<HoverData>();

    private _getOrCreateTopicThrottleMethod(topic: keyof HoverData): ThrottledPublishFunc {
        if (!this._topicThrottleMap.has(topic)) {
            const throttledMethod = throttle(this._doThrottledHoverDataUpdate.bind(this), this._dataUpdateThrottleMs, {
                // These settings make it so notifications are only pushed *after* the throttle timer elapses
                leading: false,
                trailing: true,
            });

            this._topicThrottleMap.set(topic, throttledMethod);
        }

        // If-block above gurantees this is non-null
        return this._topicThrottleMap.get(topic)!;
    }

    private _doThrottledHoverDataUpdate<T extends keyof HoverData>(topic: T, value: HoverData[T]): void {
        this._throttledHoverData[topic] = value;
        this.getPublishSubscribeDelegate().notifySubscribers(topic);
    }

    /**
     * @returns The publish-subscribe delegate used by this service
     */
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<HoverData> {
        return this._publishSubscribeDelegate;
    }

    /**
     * Gets the current value for a given topic. If the requesting module is the one currently hovering, it will get the latest data immediately, otherwise it will get the latest throttled data.
     * @param topic The HoverTopic to get the value for
     * @param moduleInstanceId The id of the module requesting the value.
     * @returns The latest or throttled value for the given topic
     */
    getTopicValue<T extends HoverTopic>(topic: T, moduleInstanceId: string): HoverData[T] | null {
        // ? Should  this be an  opt-in functionality?
        // ! The module that is currently hovering will always see the data updated immediately
        if (this._lastHoveredModule && moduleInstanceId === this._lastHoveredModule) {
            return this._hoverData[topic] ?? null;
        } else {
            return this._throttledHoverData[topic] ?? null;
        }
    }

    /**
     * Wraps {@link getTopicValue} in callback function that can be used with React's useSyncExternalStore.
     * @param topic The HoverTopic to get the value for
     * @param moduleInstanceId The id of the module requesting the value.
     * @returns A function that gets the latest value for the given topic
     */
    makeSnapshotGetter<T extends keyof HoverData>(topic: T, moduleInstanceId: string): () => HoverData[T] | null {
        return () => this.getTopicValue(topic, moduleInstanceId);
    }

    /**
     * Updates a topic's hover data
     * @param topic The HoverTopic to update
     * @param newValue The new value for the topic
     */
    updateHoverValue<T extends keyof HoverData>(topic: T, newValue: HoverData[T], moduleInstanceId: string): void {
        this._lastHoveredModule = moduleInstanceId;

        this._hoverData[topic] = newValue;
        this._getOrCreateTopicThrottleMethod(topic)(topic, newValue);

        // Notify changes (do note that only the hovering module will see any changes at this point)
        this.getPublishSubscribeDelegate().notifySubscribers(topic);
    }

    /**
     * Gets the id of the module that last updated hover data
     * @returns The id of the module that last updated hover data, or null if no module has updated hover data yet
     */
    getLastHoveredModule(): string | null {
        return this._lastHoveredModule;
    }

    /**
     * Flushes throttled updates for topics, publishing updates immediately.
     * @param topics The topics to flush. If none are provided, all topics will be flushed.
     */
    flushTopics(...topics: HoverTopic[]) {
        if (!topics.length) topics = Object.values(HoverTopic);

        for (const topic of topics) {
            this._topicThrottleMap.get(topic)?.flush();
        }
    }
}

/**
 * Hook for letting a dashboard module sync to a hover topic value
 * @param topic The topic to sync to
 * @param hoverService The hover service instance to use
 * @param moduleInstanceId The id of the module using this hook
 * @returns The current (possibly throttled) value for the given topic
 */
export function useHoverValue<T extends keyof HoverData>(
    topic: T,
    hoverService: HoverService,
    moduleInstanceId: string,
) {
    const latestValue = React.useSyncExternalStore<HoverData[T]>(
        hoverService.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        hoverService.makeSnapshotGetter(topic, moduleInstanceId),
    );

    return latestValue;
}

/**
 * Hook for letting dashboard modules update a hover topic value
 * @param topic The topic to update
 * @param hoverService The hover service instance to use
 * @param moduleInstanceId The id of the module using this hook
 * @returns A stable callback function that updates the given topic with a new value
 */
export function usePublishHoverValue<T extends keyof HoverData>(
    topic: T,
    hoverService: HoverService,
    moduleInstanceId: string,
): (v: HoverData[T]) => void {
    return React.useCallback(
        function updateHoverValue(newValue: HoverData[T]) {
            hoverService.updateHoverValue(topic, newValue, moduleInstanceId);
        },
        [hoverService, moduleInstanceId, topic],
    );
}

/**
 * Combined hook for getting and setting hover topic values
 * @param topic The topic to get and set
 * @param hoverService The hover service instance to use
 * @param moduleInstanceId The id of the module using this hook
 * @returns A value/setter tuple for the given topic. The value will be throttled
 */
export function useHover<T extends keyof HoverData>(
    topic: T,
    hoverService: HoverService,
    moduleInstanceId: string,
): [HoverData[T], (v: HoverData[T]) => void] {
    const latestValue = useHoverValue(topic, hoverService, moduleInstanceId);
    const updateValue = usePublishHoverValue(topic, hoverService, moduleInstanceId);

    return [latestValue, updateValue];
}
