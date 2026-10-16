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
    const hasClearedDisabledContentsRef = React.useRef(false);

    React.useEffect(() => {
        if (options.enabled === false) {
            if (!hasClearedDisabledContentsRef.current) {
                hasClearedDisabledContentsRef.current = true;
                prevDependenciesRef.current = [];
                options.channel.replaceContents([]);
            }
            return;
        }

        hasClearedDisabledContentsRef.current = false;
        if (!isEqual(options.dependencies, prevDependenciesRef.current)) {
            prevDependenciesRef.current = options.dependencies;
            options.channel.replaceContents(options.contents);
        }
    }, [options.channel, options.contents, options.dependencies, options.enabled]);
}
