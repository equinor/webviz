import React from "react";

import type { Channel } from "../Channel";
import { ChannelNotificationTopic } from "../Channel";

export function useChannelHasReceivers(channel: Channel): boolean {
    const subscribe = React.useCallback(
        function subscribe(onStoreChange: () => void) {
            channel.subscribe(ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED, onStoreChange);
            return () => channel.unsubscribe(ChannelNotificationTopic.RECEIVERS_ARRAY_CHANGED, onStoreChange);
        },
        [channel],
    );

    return React.useSyncExternalStore(subscribe, () => channel.getNumberOfReceivers() > 0);
}
