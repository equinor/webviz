import React from "react";

import { isEqual } from "lodash";

import { DataElement, KeyType } from "../../../DataChannelTypes";
import { ModuleChannel } from "../ModuleChannel";
import { ModuleChannelContentDefinition } from "../ModuleChannelContent";

export function usePublishChannelContents({
    channel,
    dependencies,
    contents,
    dataGenerator,
}: {
    channel: ModuleChannel;
    dependencies: any[];
    contents: ModuleChannelContentDefinition[];
    dataGenerator: (contentIdent: string) => {
        data: DataElement<KeyType>[];
        metaData?: Record<string, string | number>;
    };
}) {
    const [prevDependencies, setPrevDependencies] = React.useState<any[]>([]);

    if (!isEqual(prevDependencies, dependencies)) {
        setPrevDependencies(dependencies);

        for (const oldContent of channel.getContents()) {
            if (!contents.some((content) => content.idString === oldContent.getIdString())) {
                channel.unregisterContent(oldContent.getIdString());
            }
        }

        for (const content of contents) {
            if (!channel.hasContent(content.idString)) {
                channel.registerContent({
                    idString: content.idString,
                    displayName: content.displayName,
                    dataGenerator: () => dataGenerator(content.idString),
                });
            } else {
                channel.getContent(content.idString)?.publish(() => dataGenerator(content.idString));
            }
        }
    }
}
