import React from "react";

import { Workbench } from "./Workbench";

export type NavigatorTopicDefinitions = {
    "navigator.fieldName": string;
    "navigator.caseId": string;
};

export type GlobalTopicDefinitions = {
    "global.infoMessage": string;
    "global.depth": number;
    "global.position": { x: number; y: number };
};

export type AllTopicDefinitions = NavigatorTopicDefinitions & GlobalTopicDefinitions;

export type TopicDefinitionsType<T extends keyof AllTopicDefinitions> = T extends keyof GlobalTopicDefinitions
    ? GlobalTopicDefinitions[T]
    : T extends keyof NavigatorTopicDefinitions
    ? NavigatorTopicDefinitions[T]
    : never;

export type CallbackFunction<T extends keyof AllTopicDefinitions> = (value: AllTopicDefinitions[T]) => void;

export class WorkbenchServices {
    protected _workbench: Workbench;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    protected _subscribersMap: { [key: string]: Set<CallbackFunction<any>> };

    protected constructor(workbench: Workbench) {
        this._workbench = workbench;
        this._subscribersMap = {};
    }

    subscribe<T extends keyof AllTopicDefinitions>(topic: T, callbackFn: CallbackFunction<T>) {
        const subscribersSet = this._subscribersMap[topic] || new Set();
        subscribersSet.add(callbackFn);
        this._subscribersMap[topic] = subscribersSet;
        return () => {
            subscribersSet.delete(callbackFn);
        };
    }

    publishGlobalData<T extends keyof GlobalTopicDefinitions>(topic: T, value: TopicDefinitionsType<T>) {
        this.internalPublishAnyTopic(topic, value);
    }

    protected internalPublishAnyTopic<T extends keyof AllTopicDefinitions>(topic: T, value: TopicDefinitionsType<T>) {
        const subscribersSet = this._subscribersMap[topic];
        if (!subscribersSet) {
            return;
        }
        for (const callbackFn of subscribersSet) {
            callbackFn(value);
        }
    }
}

export function useSubscribedValue<T extends keyof AllTopicDefinitions>(
    topic: T,
    workbenchServices: WorkbenchServices
): AllTopicDefinitions[T] | null {
    const [latestValue, setLatestValue] = React.useState<AllTopicDefinitions[T] | null>(null);

    React.useEffect(
        function subscribeToServiceTopic() {
            function handleNewValue(newValue: AllTopicDefinitions[T]) {
                setLatestValue(newValue);
            }
            const unsubscribeFunc = workbenchServices.subscribe(topic, handleNewValue);
            return unsubscribeFunc;
        },
        [topic, workbenchServices]
    );

    return latestValue;
}
