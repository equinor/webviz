import { useRef, useState } from "react";

import type { Channel } from "@framework/internal/DataChannels/Channel";
import { usePublishChannelContents } from "@framework/internal/DataChannels/hooks/usePublishChannelContents";

export function PublishChannelContentsHarness({ enabled }: { enabled: boolean }) {
    const [publishedContentCount, setPublishedContentCount] = useState(0);
    const channel = useRef({ replaceContents: (contents: unknown[]) => setPublishedContentCount(contents.length) });

    usePublishChannelContents({
        channel: channel.current as Channel,
        dependencies: ["result"],
        enabled,
        contents: [
            {
                contentIdString: "result",
                displayName: "Result",
                dataGenerator: () => ({ data: [], metaData: { ensembleIdentString: "ensemble" } }),
            },
        ],
    });

    return <output data-testid="published-content-count">{publishedContentCount}</output>;
}