import React from "react";

import { isEqual } from "lodash-es";

import type { Channel } from "../Channel";
import type { ChannelContentDefinition } from "../ChannelContent";

export interface UsePublishChannelContentsOptions {
    readonly channel: Channel;
    readonly dependencies: any[];
    readonly enabled?: boolean;
    readonly contents: ChannelContentDefinition[];
}

export function usePublishChannelContents(options: UsePublishChannelContentsOptions): void {
    const prevDependenciesRef = React.useRef<any[]>([]);

    React.useEffect(() => {
        if ((options.enabled ?? true) && !isEqual(options.dependencies, prevDependenciesRef.current)) {
            prevDependenciesRef.current = options.dependencies;
            options.channel.replaceContents(options.contents);
        }
    }, [options.channel, options.contents, options.dependencies, options.enabled]);
}
