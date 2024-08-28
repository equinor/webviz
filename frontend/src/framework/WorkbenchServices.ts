import React from "react";

import { Viewport } from "@modules/_shared/components/EsvIntersection/esvIntersection";

import { isEqual } from "lodash";

import { EnsembleIdent } from "./EnsembleIdent";
import { Workbench } from "./Workbench";
import { Intersection } from "./types/intersection";
import { Wellbore } from "./types/wellbore";

export type NavigatorTopicDefinitions = {
    "navigator.dummyPlaceholder": string;
};

export type GlobalTopicDefinitions = {
    "global.infoMessage": string;
    "global.hoverRealization": { realization: number } | null;
    "global.hoverTimestamp": { timestampUtcMs: number } | null;
    "global.hoverMd": { wellboreUuid: string; md: number } | null;

    "global.syncValue.ensembles": EnsembleIdent[];
    "global.syncValue.date": { timeOrInterval: string };
    "global.syncValue.timeSeries": { vectorName: string };
    "global.syncValue.surface": { name: string; attribute: string };
    "global.syncValue.cameraPositionMap": {
        target: number[];
        zoom: number;
        rotationX: number;
        rotationOrbit: number;
    };
    "global.syncValue.wellBore": Wellbore;
    "global.syncValue.intersection": Intersection;
    "global.syncValue.cameraPositionIntersection": Viewport;
    "global.syncValue.verticalScale": number;
};

export type AllTopicDefinitions = NavigatorTopicDefinitions & GlobalTopicDefinitions;

export type TopicDefinitionsType<T extends keyof AllTopicDefinitions> = T extends keyof GlobalTopicDefinitions
    ? GlobalTopicDefinitions[T]
    : T extends keyof NavigatorTopicDefinitions
    ? NavigatorTopicDefinitions[T]
    : never;

export type SubscriberCallbackElement<T extends keyof AllTopicDefinitions> = {
    subscriberId?: string;
    callbackFn: CallbackFunction<T>;
};

export type CallbackFunction<T extends keyof AllTopicDefinitions> = (value: AllTopicDefinitions[T] | null) => void;

export class WorkbenchServices {
    protected _workbench: Workbench;
    protected _subscribersMap: Map<string, Set<SubscriberCallbackElement<any>>>;
    protected _topicValueCache: Map<string, any>;

    protected constructor(workbench: Workbench) {
        this._workbench = workbench;
        this._subscribersMap = new Map();
        this._topicValueCache = new Map();
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

    publishGlobalData<T extends keyof GlobalTopicDefinitions>(
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
