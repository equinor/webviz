import React from "react";

import type { Point2D, Point3D } from "@webviz/subsurface-viewer";
import { isEqual } from "lodash-es";

import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { InplaceVolumesFilterSettings } from "./types/inplaceVolumesFilterSettings";
import type { Intersection } from "./types/intersection";
import type { Viewport } from "./types/viewport";
import type { Wellbore } from "./types/wellbore";

/**
 * Topics carried by the {@link SyncSettingsService} - values a module opts into sharing with the other
 * modules of its dashboard (see {@link SyncSettingsHelper} in `SyncSettings.ts`).
 */
export type SyncSettingsTopicDefinitions = {
    "global.syncValue.ensembles": RegularEnsembleIdent[];
    "global.syncValue.date": { timeOrInterval: string };
    "global.syncValue.timeSeries": { vectorName: string };
    "global.syncValue.surface": { name: string; attribute: string };
    "global.syncValue.cameraPositionMap": {
        target: Point2D | Point3D | undefined;
        zoom: number;
        rotationX: number;
        rotationOrbit: number;
    };
    "global.syncValue.wellBore": Wellbore;
    "global.syncValue.intersection": Intersection;
    "global.syncValue.cameraPositionIntersection": Viewport;
    "global.syncValue.verticalScale": number;
    "global.syncValue.inplaceVolumesFilterSettings": InplaceVolumesFilterSettings;
    "global.syncValue.inplaceVolumesResultName": string;
    "global.syncValue.parameter": string;
};

export type SyncSettingsTopicValueType<T extends keyof SyncSettingsTopicDefinitions> = SyncSettingsTopicDefinitions[T];

export type SyncSettingsCallbackFunction<T extends keyof SyncSettingsTopicDefinitions> = (
    value: SyncSettingsTopicDefinitions[T] | null,
) => void;

type SubscriberCallbackElement<T extends keyof SyncSettingsTopicDefinitions> = {
    subscriberId?: string;
    callbackFn: SyncSettingsCallbackFunction<T>;
};

/**
 * Publish/subscribe bus for module sync settings - one per `Dashboard`, so syncing stays within a
 * dashboard even while several are mounted.
 *
 * A subscriber passing its module instance id as `subscriberId` isn't notified of its own publishes
 * (`publisherId`), so high-frequency two-way sync (e.g. a camera drag) doesn't fight the user's input.
 */
export class SyncSettingsService {
    private _subscribersMap: Map<string, Set<SubscriberCallbackElement<any>>> = new Map();
    private _topicValueCache: Map<string, any> = new Map();

    subscribe<T extends keyof SyncSettingsTopicDefinitions>(
        topic: T,
        callbackFn: SyncSettingsCallbackFunction<T>,
        subscriberId?: string,
    ): () => void {
        const subscribersSet = this._subscribersMap.get(topic) || new Set();
        const newElement = {
            subscriberId,
            callbackFn,
        };
        subscribersSet.add(newElement);
        this._subscribersMap.set(topic, subscribersSet);

        // If we already have a value for this topic, trigger the callback immediately so a
        // module that mounts later still picks up the current synced value.
        if (this._topicValueCache.has(topic)) {
            callbackFn(this._topicValueCache.get(topic));
        }

        return () => {
            subscribersSet.delete(newElement);
        };
    }

    publishValue<T extends keyof SyncSettingsTopicDefinitions>(
        topic: T,
        value: SyncSettingsTopicValueType<T>,
        publisherId?: string,
    ): void {
        // Compression: if the value is unchanged from the last publish, don't notify anyone.
        if (this._topicValueCache.has(topic)) {
            const cachedValue = this._topicValueCache.get(topic);
            if (isEqual(value, cachedValue)) {
                return;
            }
        }

        this._topicValueCache.set(topic, value);

        const subscribersSet = this._subscribersMap.get(topic);
        if (!subscribersSet) {
            return;
        }

        for (const { subscriberId, callbackFn } of subscribersSet) {
            if (publisherId === undefined || publisherId !== subscriberId) {
                callbackFn(value);
            }
        }
    }
}

/**
 * Subscribes to a {@link SyncSettingsService} topic while `enable` (the module's sync key being on) is
 * true, returning the latest value (`null` before any publish). Disabling resets the value right away,
 * so a module that opts out stops using the synced value in the same render.
 */
export function useSubscribedValueConditionally<T extends keyof SyncSettingsTopicDefinitions>(
    topic: T,
    enable: boolean,
    syncSettingsService: SyncSettingsService,
    subscriberId?: string,
): SyncSettingsTopicDefinitions[T] | null {
    const [latestValue, setLatestValue] = React.useState<SyncSettingsTopicDefinitions[T] | null>(null);
    const [prevEnable, setPrevEnable] = React.useState(enable);

    if (prevEnable !== enable) {
        setPrevEnable(enable);
        if (!enable) setLatestValue(null);
    }

    React.useEffect(
        function subscribeToServiceTopic() {
            if (!enable) return;
            function handleNewValue(newValue: SyncSettingsTopicDefinitions[T] | null) {
                setLatestValue(newValue);
            }

            const unsubscribeFunc = syncSettingsService.subscribe(topic, handleNewValue, subscriberId);
            return () => {
                unsubscribeFunc();
            };
        },
        [topic, enable, syncSettingsService, subscriberId],
    );

    return latestValue;
}
