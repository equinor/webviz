import React from "react";

import type { Point2D, Point3D } from "@webviz/subsurface-viewer";
import { isEqual } from "lodash-es";

import type { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import type { InplaceVolumesFilterSettings } from "./types/inplaceVolumesFilterSettings";
import type { Intersection } from "./types/intersection";
import type { Viewport } from "./types/viewport";
import type { Wellbore } from "./types/wellbore";

/**
 * Topics carried by the {@link SyncSettingsService}.
 *
 * These are the module "sync settings" - values a module opts into sharing with the other
 * modules of the same dashboard (see {@link SyncSettingsHelper} in `SyncSettings.ts`). One
 * {@link SyncSettingsService} instance is owned per `Dashboard`, so syncing never crosses
 * dashboard boundaries - not even while several dashboards are mounted at once by the
 * dashboard hot-cache.
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
 * Per-dashboard publish/subscribe bus for module sync settings.
 *
 * One instance is owned by each `Dashboard` (see `Dashboard.getSyncSettingsService`), which
 * keeps synced values scoped to a single dashboard even when several dashboards are mounted
 * at once by the dashboard hot-cache.
 *
 * Publishing carries an optional `publisherId` (the module instance id). A subscriber that
 * passes the same id as `subscriberId` is not notified of its own publishes - this keeps
 * high-frequency bidirectional sync (e.g. camera position during a drag) from fighting the
 * user's live input.
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
            if (subscriberId === undefined || publisherId === undefined || subscriberId !== publisherId) {
                callbackFn(value);
            }
        }
    }
}

export function useSubscribedValueConditionally<T extends keyof SyncSettingsTopicDefinitions>(
    topic: T,
    enable: boolean,
    syncSettingsService: SyncSettingsService,
    subscriberId?: string,
): SyncSettingsTopicDefinitions[T] | null {
    const [latestValue, setLatestValue] = React.useState<SyncSettingsTopicDefinitions[T] | null>(null);

    React.useEffect(
        function subscribeToSyncSettingsTopic() {
            if (!enable) {
                setLatestValue(null);
                return;
            }

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
