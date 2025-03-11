import React from "react";

import { PublishSubscribeDelegate } from "@modules/_shared/LayerFramework/delegates/PublishSubscribeDelegate";

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
    #hoverData: Partial<HoverData> = {};
    #throttledHoverData: Partial<HoverData> = {};

    #lastHoveredModule: string | null = null;

    // Throttling. Each topic is updated with its own throttle method.
    #topicThrottleMap = new Map<keyof HoverData, ThrottledPublishFunc>();
    #dataUpdateThrottleMs = 100;

    // Delegate to handle update notifications
    #publishSubscribeDelegate = new PublishSubscribeDelegate<keyof HoverData>();

    #getOrCreateTopicThrottleMethod(topic: keyof HoverData): ThrottledPublishFunc {
        if (!this.#topicThrottleMap.has(topic)) {
            const throttledMethod = _.throttle(
                this.#doThrottledHoverDataUpdate.bind(this),
                this.#dataUpdateThrottleMs,
                {
                    // These settings make it so notifications are only pushed *after* the throttle timer elapses
                    leading: false,
                    trailing: true,
                }
            );

            this.#topicThrottleMap.set(topic, throttledMethod);
        }

        // If-block above gurantees this is non-null
        return this.#topicThrottleMap.get(topic)!;
    }

    #doThrottledHoverDataUpdate<T extends keyof HoverData>(topic: T, value: HoverData[T]): void {
        this.#throttledHoverData[topic] = value;
        this.getPublishSubscribeDelegate().notifySubscribers(topic);
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<keyof HoverData> {
        return this.#publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof HoverData>(topic: T, moduleInstanceId: string): () => HoverData[T] | null {
        // ? Should  this be an  opt-in functionality?
        // ! The module that is currently hovering will always see the data updated immedietally
        if (this.#lastHoveredModule && moduleInstanceId === this.#lastHoveredModule) {
            return () => this.#hoverData[topic] ?? null;
        } else {
            return () => this.#throttledHoverData[topic] ?? null;
        }
    }

    updateHoverValue<T extends keyof HoverData>(topic: T, newValue: HoverData[T]): void {
        this.#hoverData[topic] = newValue;
        this.#getOrCreateTopicThrottleMethod(topic)(topic, newValue);
    }

    setLastHoveredModule(moduleInstanceId: string | null) {
        if (this.#lastHoveredModule === moduleInstanceId) return;

        this.#lastHoveredModule = moduleInstanceId;

        // This might change what data-object a subscriber should get info from. Therefore, each subscriber needs to be
        // notified that they should check their snapshots again.
        // ? It seems to be fine without this? Is it because the modules are being re-rendered anyways?
        // _.values(HoverTopic).forEach((topic) => this.getPublishSubscribeDelegate().notifySubscribers(topic));
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
    moduleInstanceId: string
): [HoverData[T], (v: HoverData[T]) => void] {
    const latestValue = React.useSyncExternalStore<HoverData[T]>(
        hoverService.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        hoverService.makeSnapshotGetter(topic, moduleInstanceId)
    );

    const updateValue = React.useCallback(
        function updateHoverValue(newValue: HoverData[T]) {
            hoverService.setLastHoveredModule(moduleInstanceId);
            hoverService.updateHoverValue(topic, newValue);
        },
        [hoverService, moduleInstanceId, topic]
    );

    return [latestValue, updateValue];
}
