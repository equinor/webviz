import React from "react";

import { isEqual } from "lodash";

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

    React.useEffect(() => {
        if ((options.enabled || options.enabled === undefined) && !isEqual(prevDependencies, options.dependencies)) {
            setPrevDependencies(options.dependencies);

            options.channel.replaceContents(options.contents);
        }
    }, [options.channel, options.contents, options.dependencies, prevDependencies, options.enabled]);
}
