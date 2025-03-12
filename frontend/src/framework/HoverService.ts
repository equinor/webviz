import React from "react";

import { PublishSubscribeDelegate } from "@modules/_shared/utils/PublishSubscribeDelegate";

import _ from "lodash";

export enum HoverTopic {
    MD = "hover.md",
    WELLBORE = "hover.wellbore",
    REALIZATION = "hover.realization",
    TIMESTAMP = "hover.timestamp",
    ZONE = "hover.zone",
    REGION = "hover.region",
    FACIES = "hover.facies",
}

export type HoverData = {
    [HoverTopic.MD]: number | null;
    [HoverTopic.WELLBORE]: string | null;
    [HoverTopic.REALIZATION]: number | null;
    [HoverTopic.TIMESTAMP]: number | null;
    [HoverTopic.ZONE]: string | null;
    [HoverTopic.REGION]: string | null;
    [HoverTopic.FACIES]: string | null;
};

// Possible future functionality
// - Some system to get derived "hovers"? A hovered wellbore implies a Well, which implies a field, and so on...

export type ThrottledPublishFunc = _.DebouncedFunc<
    <T extends keyof HoverData>(topic: T, newValue: HoverData[T]) => void
>;

export class HoverService {
    // Currently available hover-data. The two objects are updated at different rates, but will contain the same data
    // when the system is not actively hovering
    private _hoverData: Partial<HoverData> = {};
    private _throttledHoverData: Partial<HoverData> = {};

    private _lastHoveredModule: string | null = null;

    // Throttling. Each topic is updated with its own throttle method.
    private _topicThrottleMap = new Map<keyof HoverData, ThrottledPublishFunc>();
    private _dataUpdateThrottleMs = 100;

    // Delegate to handle update notifications
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<HoverData>();

    private _getOrCreateTopicThrottleMethod(topic: keyof HoverData): ThrottledPublishFunc {
        if (!this._topicThrottleMap.has(topic)) {
            const throttledMethod = _.throttle(
                this._doThrottledHoverDataUpdate.bind(this),
                this._dataUpdateThrottleMs,
                {
                    // These settings make it so notifications are only pushed *after* the throttle timer elapses
                    leading: false,
                    trailing: true,
                },
            );

            this._topicThrottleMap.set(topic, throttledMethod);
        }

        // If-block above gurantees this is non-null
        return this._topicThrottleMap.get(topic)!;
    }

    private _doThrottledHoverDataUpdate<T extends keyof HoverData>(topic: T, value: HoverData[T]): void {
        this._throttledHoverData[topic] = value;
        this.getPublishSubscribeDelegate().notifySubscribers(topic);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<HoverData> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof HoverData>(topic: T, moduleInstanceId: string): () => HoverData[T] | null {
        // ? Should  this be an  opt-in functionality?
        // ! The module that is currently hovering will always see the data updated immedietally
        if (this._lastHoveredModule && moduleInstanceId === this._lastHoveredModule) {
            return () => this._hoverData[topic] ?? null;
        } else {
            return () => this._throttledHoverData[topic] ?? null;
        }
    }

    updateHoverValue<T extends keyof HoverData>(topic: T, newValue: HoverData[T]): void {
        this._hoverData[topic] = newValue;
        this._getOrCreateTopicThrottleMethod(topic)(topic, newValue);
    }

    setLastHoveredModule(moduleInstanceId: string | null) {
        if (this._lastHoveredModule === moduleInstanceId) return;

        this._lastHoveredModule = moduleInstanceId;
    }

    // ? Currently, the md and wellbore hovers are "cleared" when the module implementer sets them to null.
    // ? Should there be a more explicit way to stop hovering?
    // endHoverEffect(): void {
    //     this.#lastHoveredModule = null
    //     this.#hoverData = {}
    //     this.#throttledHoverData = {}
    //     // notify subscribers...
    // }
}

export function useHoverValue<T extends keyof HoverData>(
    topic: T,
    hoverService: HoverService,
    moduleInstanceId: string,
): [HoverData[T], (v: HoverData[T]) => void] {
    const latestValue = React.useSyncExternalStore<HoverData[T]>(
        hoverService.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        hoverService.makeSnapshotGetter(topic, moduleInstanceId),
    );

    const updateValue = React.useCallback(
        function updateHoverValue(newValue: HoverData[T]) {
            hoverService.setLastHoveredModule(moduleInstanceId);
            hoverService.updateHoverValue(topic, newValue);
        },
        [hoverService, moduleInstanceId, topic],
    );

    return [latestValue, updateValue];
}
