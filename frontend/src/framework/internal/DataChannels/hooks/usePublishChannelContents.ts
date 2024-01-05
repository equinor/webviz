import React from "react";

import { isEqual } from "lodash";

import { ModuleChannel } from "../ModuleChannel";
import { DataGenerator, ModuleChannelContentDefinition } from "../ModuleChannelContent";

export function usePublishChannelContents({
    channel,
    dependencies,
    enabled,
    contents,
    dataGenerator,
}: {
    channel: ModuleChannel;
    dependencies: any[];
    enabled?: boolean;
    contents: ModuleChannelContentDefinition[];
    dataGenerator: (contentIdString: string) => ReturnType<DataGenerator>;
}) {
    const [prevDependencies, setPrevDependencies] = React.useState<any[]>([]);

    React.useEffect(() => {
        if ((enabled || enabled === undefined) && !isEqual(prevDependencies, dependencies)) {
            setPrevDependencies(dependencies);

            channel.replaceContents(
                contents.map((content) => ({ ...content, dataGenerator: () => dataGenerator(content.idString) }))
            );
        }
    }, [channel, contents, dataGenerator, dependencies, prevDependencies, enabled]);
}
