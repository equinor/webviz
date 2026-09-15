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
    const [prevDependencies, setPrevDependencies] = React.useState<any[]>([]);

    if (!isEqual(prevDependencies, options.dependencies) && (options.enabled || options.enabled === undefined)) {
        setPrevDependencies(options.dependencies);
    }

    React.useEffect(() => {
        options.channel.replaceContents(options.contents);
    }, [prevDependencies, options.channel, options.contents]);
}
