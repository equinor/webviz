import React from "react";

import { Point2D, Point3D } from "@webviz/subsurface-viewer";

import _, { isEqual } from "lodash";

import { RegularEnsembleIdent } from "./RegularEnsembleIdent";
import { Workbench } from "./Workbench";
import { InplaceVolumetricsFilter } from "./types/inplaceVolumetricsFilter";
import { Intersection } from "./types/intersection";
import { Viewport } from "./types/viewport";
import { Wellbore } from "./types/wellbore";

export type NavigatorTopicDefinitions = {
    "navigator.dummyPlaceholder": string;
};

export type GlobalTopicDefinitions = {
    "global.infoMessage": string;
    "global.hoverRealization": { realization: number } | null;
    "global.hoverTimestamp": { timestampUtcMs: number } | null;
    /** @deprecated use `global.hover.md` and `global.hover.wellbore` instead to delegate to hover-service */
    "global.hoverMd": { wellboreUuid: string; md: number } | null;
    "global.hoverZone": { zoneName: string } | null;
    "global.hoverRegion": { regionName: string } | null;
    "global.hoverFacies": { faciesName: string } | null;

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
    "global.syncValue.inplaceVolumetricsFilter": InplaceVolumetricsFilter;
    "global.syncValue.inplaceVolumetricsResultName": string;
};

type HoverTopicDefinitions = {
    "hover.md": number | null;
    "hover.wellbore": string | null;
};

export type AllTopicDefinitions = NavigatorTopicDefinitions & GlobalTopicDefinitions & HoverTopicDefinitions;

export type TopicDefinitionsType<T extends keyof AllTopicDefinitions> = T extends keyof GlobalTopicDefinitions
    ? GlobalTopicDefinitions[T]
    : T extends keyof NavigatorTopicDefinitions
    ? NavigatorTopicDefinitions[T]
    : T extends keyof HoverTopicDefinitions
    ? HoverTopicDefinitions[T]
    : never;

export type SubscriberCallbackElement<T extends keyof AllTopicDefinitions> = {
    subscriberId?: string;
    callbackFn: CallbackFunction<T>;
};

export type CallbackFunction<T extends keyof AllTopicDefinitions> = (value: AllTopicDefinitions[T] | null) => void;

class HoverService {
    _workbenchServices: WorkbenchServices;
    _updateThrottleMs = 100;

    // Each broadcasted topic needs their own debounce method
    _topicThrottleMap: Map<keyof HoverTopicDefinitions, _.DebouncedFunc<HoverService["_doPublishHoverData"]>>;

    constructor(workbenchServices: WorkbenchServices) {
        this._workbenchServices = workbenchServices;
        this._topicThrottleMap = new Map();
    }

    publishHoverData<T extends keyof HoverTopicDefinitions>(
        topic: T,
        subscribers: Set<SubscriberCallbackElement<any>>,
        value: HoverTopicDefinitions[T],
        publisherId?: string
    ) {
        const throttleFunc = this._getOrCreateTopicThrottleMethod(topic);

        throttleFunc(subscribers, value, publisherId);
    }

    private _getOrCreateTopicThrottleMethod<T extends keyof HoverTopicDefinitions>(
        topic: T
    ): _.DebouncedFunc<HoverService["_doPublishHoverData"]> {
        if (!this._topicThrottleMap.has(topic)) {
            const throttledMethod = _.throttle(this._doPublishHoverData, this._updateThrottleMs);
            this._topicThrottleMap.set(topic, throttledMethod);
        }

        // If-block above gurantees this is non-null
        return this._topicThrottleMap.get(topic)!;
    }

    private _doPublishHoverData<T extends keyof HoverTopicDefinitions>(
        subscribers: Set<SubscriberCallbackElement<any>>,
        value: HoverTopicDefinitions[T],
        publisherId?: string
    ) {
        for (const { subscriberId, callbackFn } of subscribers) {
            if (subscriberId === undefined || publisherId === undefined || subscriberId !== publisherId) {
                callbackFn(value);
            }
        }
    }
}
export class WorkbenchServices {
    protected _workbench: Workbench;
    protected _subscribersMap: Map<string, Set<SubscriberCallbackElement<any>>>;
    protected _topicValueCache: Map<string, any>;

    // Sub-service. Manages hover events specifically, and adds a throttle to it
    protected _hoverService: HoverService;

    protected constructor(workbench: Workbench) {
        this._workbench = workbench;
        this._subscribersMap = new Map();
        this._topicValueCache = new Map();

        this._hoverService = new HoverService(this);
    }

    subscribe<T extends keyof AllTopicDefinitions>(topic: T, callbackFn: CallbackFunction<T>, subscriberId?: string) {
        const subscribersSet = this._subscribersMap.get(topic) || new Set();
        const newElement = {
            subscriberId,
            callbackFn,
        };
        subscribersSet.add(newElement);
        this._subscribersMap.set(topic, subscribersSet);

        // If we already have a value for this topic, trigger the callback immediately
        // May have to revise this and make it an op-in behavior, but for now it's fine
        if (this._topicValueCache.has(topic)) {
            callbackFn(this._topicValueCache.get(topic));
        }

        return () => {
            subscribersSet.delete(newElement);
        };
    }

    publishGlobalData<T extends keyof AllTopicDefinitions>(
        topic: T,
        value: TopicDefinitionsType<T>,
        publisherId?: string
    ) {
        this.internalPublishAnyTopic(topic, value, publisherId);
    }

    protected internalPublishAnyTopic<T extends keyof AllTopicDefinitions>(
        topic: T,
        value: TopicDefinitionsType<T>,
        publisherId?: string
    ) {
        // Always do compression so that if the value is the same as the last value, don't publish
        // Serves as a sensible default behavior until we see a need for more complex behavior
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

        // Delegate to hover-service to throttle updates
        if (topic.startsWith("hover.")) {
            const hoverTopic = topic as keyof HoverTopicDefinitions;
            const hoverValue = value as HoverTopicDefinitions[typeof hoverTopic];

            this._hoverService.publishHoverData(hoverTopic, subscribersSet, hoverValue, publisherId);
            return;
        }

        for (const { subscriberId, callbackFn } of subscribersSet) {
            if (subscriberId === undefined || publisherId === undefined || subscriberId !== publisherId) {
                callbackFn(value);
            }
        }
    }
}

export function useSubscribedValue<T extends keyof AllTopicDefinitions>(
    topic: T,
    workbenchServices: WorkbenchServices,
    subscriberId?: string
): AllTopicDefinitions[T] | null {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T] | null>(null);

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: AllTopicDefinitions[T] | null) {
                setLatestValue(newValue);
            }
            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue, subscriberId);
            return unsubscribeFunc;
        },
        [topic, workbenchServices, subscriberId]
    );

    return latestValue;
}

export function useSubscribedValueConditionally<T extends keyof AllTopicDefinitions>(
    topic: T,
    enable: boolean,
    workbenchServices: WorkbenchServices,
    subscriberId?: string
): AllTopicDefinitions[T] | null {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T] | null>(null);

    React.useEffect(
        function subscribeToServiceTopic() {
            if (!enable) {
                setLatestValue(null);
                return;
            }

            function handleNewValue(newValue: AllTopicDefinitions[T] | null) {
                setLatestValue(newValue);
            }

            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue, subscriberId);
            return () => {
                unsubscribeFunc();
            };
        },
        [topic, enable, workbenchServices, subscriberId]
    );

    return latestValue;
}

export function useHoverValue<T extends keyof HoverTopicDefinitions>(
    topic: T,
    moduleId: string,
    workbenchServices: WorkbenchServices
): [HoverTopicDefinitions[T], (v: AllTopicDefinitions[T]) => void, boolean] {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T]>(null);

    // Helper to track if the update if the latest update came from the implementer, or someone else
    const [updateIsInteral, setUpdateIsInteral] = React.useState<boolean>(false);

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: AllTopicDefinitions[T] | null) {
                setLatestValue(newValue);
                setUpdateIsInteral(false);
            }
            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue, moduleId);
            return unsubscribeFunc;
        },
        [workbenchServices, moduleId, topic]
    );

    const updateValue = React.useCallback(
        function updateValue(newVal: AllTopicDefinitions[T]) {
            setLatestValue(newVal);
            setUpdateIsInteral(true);

            // @ts-expect-error Dont know how to fix the typing for newVal here
            workbenchServices.publishGlobalData(topic, newVal, moduleId);
        },
        [moduleId, topic, workbenchServices]
    );

    return [latestValue, updateValue, updateIsInteral];
}
