import React from "react";

import { isEqual } from "lodash";

import { ModuleChannel } from "../ModuleChannel";
import { DataGenerator, ModuleChannelContentDefinition } from "../ModuleChannelContent";

export function usePublishChannelContents({
    channel,
    dependencies,
    contents,
    dataGenerator,
}: {
    channel: ModuleChannel;
    dependencies: any[];
    contents: ModuleChannelContentDefinition[];
    dataGenerator: (contentIdString: string) => ReturnType<DataGenerator>;
}) {
    const [prevDependencies, setPrevDependencies] = React.useState<any[]>([]);

    React.useEffect(() => {
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
    }, [channel, contents, dataGenerator, dependencies, prevDependencies]);
}