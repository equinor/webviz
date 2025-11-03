import React from "react";

import type { PublishSubscribe, TopicPayloads } from "./NewPublishSubscribeDelegate";

export class ReactPublishSubscribeAdapter<TPayload> {
    private _subscribe: (callback: (payload: TPayload) => void) => () => void;
    private _getLatestValue: () => TPayload | undefined;

    constructor(
        _subscribe: (callback: (payload: TPayload) => void) => () => void,
        _getLatestValue: () => TPayload | undefined,
    ) {
        this._subscribe = _subscribe;
        this._getLatestValue = _getLatestValue;
    }

    getSubscribe(): (onStoreChangeCallback: () => void) => () => void {
        return (onStoreChangeCallback) => {
            return this._subscribe(() => {
                onStoreChangeCallback();
            });
        };
    }

    getSnapshotGetter(): () => TPayload {
        return () => {
            const value = this._getLatestValue();
            if (value === undefined) {
                throw new Error("No value available for topic");
            }
            return value;
        };
    }
}

export function usePublishSubscribeTopicValue<
    TTopicPayloads extends TopicPayloads,
    TTopic extends keyof TTopicPayloads,
>(publishSubscribe: PublishSubscribe<TTopicPayloads>, topic: TTopic): TTopicPayloads[TTopic] {
    const adapter = React.useMemo(() => {
        const delegate = publishSubscribe.getPublishSubscribeDelegate();
        return new ReactPublishSubscribeAdapter<TTopicPayloads[TTopic]>(
            (callback) => delegate.subscribe(topic, callback),
            () => delegate.getLatestValue(topic),
        );
    }, [publishSubscribe, topic]);

    return React.useSyncExternalStore<TTopicPayloads[TTopic]>(adapter.getSubscribe(), adapter.getSnapshotGetter());
}
