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

            channel.replaceContents(
                contents.map((content) => ({ ...content, dataGenerator: () => dataGenerator(content.idString) }))
            );
        }
    }, [channel, contents, dataGenerator, dependencies, prevDependencies]);
}
